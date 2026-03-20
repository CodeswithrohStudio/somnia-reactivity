// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReactiveWill
 * @notice Dead man's switch inheritance protocol on Somnia Testnet.
 *         Somnia Reactivity listens to WillExecuted, BeneficiaryPaid, and
 *         CheckInMissed events emitted here to push real-time UI updates
 *         to the beneficiary dashboard — no polling, no page refresh.
 */
contract ReactiveWill {
    struct Beneficiary {
        address payable wallet;
        uint256 basisPoints; // out of 10000
    }

    address public owner;
    uint256 public totalDeposited;
    uint256 public checkInDeadline;
    bool public isExecuted;
    uint256 public constant CHECK_IN_INTERVAL = 30 days;

    Beneficiary[] private beneficiaries;

    // ─── Events (Somnia Reactivity subscribes to these) ─────────────────────
    event WillExecuted(address indexed owner, uint256 totalAmount, uint256 timestamp);
    event BeneficiaryPaid(address indexed heir, uint256 amount);
    event CheckInMissed(address indexed owner, uint256 deadline);
    event CheckedIn(address indexed owner, uint256 newDeadline);
    event Deposited(address indexed owner, uint256 amount);
    event BeneficiariesSet(address indexed owner, uint256 count);

    // ─── Errors ──────────────────────────────────────────────────────────────
    error NotOwner();
    error AlreadyExecuted();
    error CheckInNotMissed();
    error InvalidAllocations();
    error NoBeneficiaries();
    error TransferFailed();
    error ZeroDeposit();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notExecuted() {
        if (isExecuted) revert AlreadyExecuted();
        _;
    }

    constructor() {
        owner = msg.sender;
        checkInDeadline = block.timestamp + CHECK_IN_INTERVAL;
    }

    // ─── Deposit ─────────────────────────────────────────────────────────────

    function deposit() external payable onlyOwner notExecuted {
        if (msg.value == 0) revert ZeroDeposit();
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    receive() external payable {
        if (msg.value > 0 && msg.sender == owner && !isExecuted) {
            totalDeposited += msg.value;
            emit Deposited(msg.sender, msg.value);
        }
    }

    // ─── Beneficiary Management ───────────────────────────────────────────────

    function setBeneficiaries(
        address payable[] calldata wallets,
        uint256[] calldata bps
    ) external onlyOwner notExecuted {
        if (wallets.length == 0) revert NoBeneficiaries();
        if (wallets.length != bps.length) revert InvalidAllocations();

        uint256 total;
        for (uint256 i = 0; i < bps.length; i++) {
            total += bps[i];
        }
        if (total != 10000) revert InvalidAllocations();

        delete beneficiaries;
        for (uint256 i = 0; i < wallets.length; i++) {
            beneficiaries.push(Beneficiary({ wallet: wallets[i], basisPoints: bps[i] }));
        }

        emit BeneficiariesSet(msg.sender, wallets.length);
    }

    // ─── Check-in ─────────────────────────────────────────────────────────────

    function checkIn() external onlyOwner notExecuted {
        checkInDeadline = block.timestamp + CHECK_IN_INTERVAL;
        emit CheckedIn(msg.sender, checkInDeadline);
    }

    // ─── Execution ────────────────────────────────────────────────────────────

    /**
     * @notice Anyone can call this once checkInDeadline has passed.
     *         Emits CheckInMissed then WillExecuted (for Somnia Reactivity),
     *         then BeneficiaryPaid per heir.
     */
    function execute() external notExecuted {
        if (block.timestamp <= checkInDeadline) revert CheckInNotMissed();
        if (beneficiaries.length == 0) revert NoBeneficiaries();

        isExecuted = true;
        uint256 balance = address(this).balance;

        emit CheckInMissed(owner, checkInDeadline);
        emit WillExecuted(owner, balance, block.timestamp);

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            uint256 share = (balance * beneficiaries[i].basisPoints) / 10000;
            if (share > 0) {
                (bool ok, ) = beneficiaries[i].wallet.call{ value: share }("");
                if (!ok) revert TransferFailed();
                emit BeneficiaryPaid(beneficiaries[i].wallet, share);
            }
        }
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function getWillStatus()
        external
        view
        returns (
            address _owner,
            uint256 _totalDeposited,
            uint256 _checkInDeadline,
            bool _isExecuted,
            address[] memory _beneficiaryWallets,
            uint256[] memory _allocations
        )
    {
        _owner = owner;
        _totalDeposited = totalDeposited;
        _checkInDeadline = checkInDeadline;
        _isExecuted = isExecuted;

        _beneficiaryWallets = new address[](beneficiaries.length);
        _allocations = new uint256[](beneficiaries.length);
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            _beneficiaryWallets[i] = beneficiaries[i].wallet;
            _allocations[i] = beneficiaries[i].basisPoints;
        }
    }

    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaries.length;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
