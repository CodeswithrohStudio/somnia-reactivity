// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReactiveService
 * @notice Interface for Somnia's on-chain Reactivity service.
 *         ReactiveWill emits events that external Somnia Reactivity
 *         subscriptions (created via the @somnia-chain/reactivity SDK)
 *         listen to and forward to off-chain subscribers in real time.
 *
 *         For on-chain reactivity (contract-to-contract), a handler
 *         contract implementing _onEvent() receives the forwarded call.
 */
interface IReactiveService {
    /**
     * @notice Called by Somnia's reactive infrastructure when a subscribed
     *         event fires. Override this in your handler contract.
     * @param emitter The contract that emitted the event
     * @param eventTopics The indexed topics of the event (topic[0] = sig)
     * @param data ABI-encoded non-indexed event data
     */
    function _onEvent(
        address emitter,
        bytes32[] calldata eventTopics,
        bytes calldata data
    ) external;
}
