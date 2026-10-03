import { BaseError, decodeErrorResult, isHex, UserRejectedRequestError, type Hex } from "viem";
import { allErrorsAbi } from "./abis.js";

export class HumeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/// Thrown by methods that depend on a layer the caller did not configure (e.g. `apiUrl` for
/// `options.quote`). Callers should not receive a faked value in place of these;
/// PROJECT_BRIEF.md Section 10 requires offchain analytics to never become the source of
/// settlement truth, and Section 31 requires historical data to come from the indexer, never a
/// frontend RPC substitute.
export class NotImplementedError extends HumeError {
  constructor(method: string, reason: string) {
    super(`@hume/sdk: ${method}() is not implemented yet — ${reason}`);
  }
}

/// The wallet owner declined to sign.
export class UserRejectedError extends HumeError {}

/// A contract reverted with a custom error (PROJECT_BRIEF.md Section 36). `errorName` and `args`
/// are decoded from the revert data; the subclasses below cover the errors Section 36 names.
export class HumeContractError extends HumeError {
  constructor(
    readonly errorName: string,
    readonly args: readonly unknown[],
    cause?: unknown,
  ) {
    super(`Contract reverted: ${errorName}(${args.map(String).join(", ")})`, { cause });
  }
}

export class MarketPausedError extends HumeContractError {}
export class InvalidOraclePriceError extends HumeContractError {}
export class StaleOraclePriceError extends HumeContractError {}
export class InsufficientCollateralError extends HumeContractError {}
export class InsufficientMarginError extends HumeContractError {}
export class PositionLimitExceededError extends HumeContractError {}
export class OpenInterestLimitExceededError extends HumeContractError {}
/// The market's long and short open interest may not differ by more than its limit, and this order would
/// widen the gap. An order on the smaller side is still accepted.
export class NetOpenInterestLimitExceededError extends OpenInterestLimitExceededError {}
/// The vault's pool cannot pay this profit yet: it pays winners from capital it holds beyond what it owes
/// users, and it refuses a payout that would leave it owing more than it holds. It clears once losing
/// positions settle or the pool is funded, so the position stays open and the same call can be retried.
export class InsufficientPoolReservesError extends HumeContractError {}
export class DeadlineExpiredError extends HumeContractError {}
/// The option premium was not authorised by a valid, unexpired, unused quote (see `OptionsEngine`).
export class InvalidQuoteError extends HumeContractError {}
/// The signed premium is outside what the position can be worth at the current price. Ask for a new
/// price: the one quoted was off, or the market moved since it was signed.
export class PremiumOutOfBoundsError extends HumeContractError {}
/// The position has not reached its expiry, so it cannot be settled yet.
export class PositionNotExpiredError extends HumeContractError {}
export class QuoteExpiredError extends HumeContractError {}
export class QuoteAlreadyUsedError extends HumeContractError {}
export class SlippageExceededError extends HumeContractError {}
export class OrderNotOpenError extends HumeContractError {}
export class OrderExpiredError extends HumeContractError {}
/// The mark price has not reached the limit order's trigger yet.
export class LimitPriceNotReachedError extends HumeContractError {}
export class InvalidTriggerPriceError extends HumeContractError {}
/// The mark price has not reached the stop-loss or take-profit trigger yet.
export class TriggerPriceNotReachedError extends HumeContractError {}

type ContractErrorClass = new (errorName: string, args: readonly unknown[], cause?: unknown) => HumeContractError;

const contractErrorClasses: Record<string, ContractErrorClass> = {
  MarketPaused: MarketPausedError,
  MarketOraclePaused: MarketPausedError,
  InvalidOraclePrice: InvalidOraclePriceError,
  StaleOraclePrice: StaleOraclePriceError,
  InsufficientCollateral: InsufficientCollateralError,
  InsufficientMargin: InsufficientMarginError,
  PositionLimitExceeded: PositionLimitExceededError,
  OpenInterestLimitExceeded: OpenInterestLimitExceededError,
  NetOpenInterestLimitExceeded: NetOpenInterestLimitExceededError,
  InsufficientPoolReserves: InsufficientPoolReservesError,
  DeadlineExpired: DeadlineExpiredError,
  InvalidQuote: InvalidQuoteError,
  PremiumOutOfBounds: PremiumOutOfBoundsError,
  PositionNotExpired: PositionNotExpiredError,
  QuoteExpired: QuoteExpiredError,
  QuoteAlreadyUsed: QuoteAlreadyUsedError,
  SlippageExceeded: SlippageExceededError,
  OrderNotOpen: OrderNotOpenError,
  OrderExpired: OrderExpiredError,
  LimitPriceNotReached: LimitPriceNotReachedError,
  InvalidTriggerPrice: InvalidTriggerPriceError,
  TriggerPriceNotReached: TriggerPriceNotReachedError,
};

/// Revert data can sit on any error in viem's `cause` chain, under different property names
/// depending on which layer produced it (`raw` on ContractFunctionRevertedError, `data` on
/// RPC errors), so walk the whole chain.
function findRevertData(error: BaseError): Hex | undefined {
  let found: Hex | undefined;
  error.walk((candidate) => {
    const { raw, data } = candidate as { raw?: unknown; data?: unknown };
    for (const value of [raw, data]) {
      if (typeof value === "string" && isHex(value) && value.length >= 10) {
        found = value;
        return true;
      }
    }
    return false;
  });
  return found;
}

/// Converts a viem error into a typed Hume error where possible. Anything not recognised is
/// returned unchanged so no information is lost.
export function mapError(error: unknown): unknown {
  if (error instanceof HumeError) return error;
  if (!(error instanceof BaseError)) return error;

  if (error.walk((candidate) => candidate instanceof UserRejectedRequestError)) {
    return new UserRejectedError("User rejected the request", { cause: error });
  }

  const data = findRevertData(error);
  if (!data) return error;

  try {
    const decoded = decodeErrorResult({ abi: allErrorsAbi, data });
    const ErrorClass = contractErrorClasses[decoded.errorName] ?? HumeContractError;
    return new ErrorClass(decoded.errorName, decoded.args ?? [], error);
  } catch {
    return error;
  }
}
