import { Context } from "effect";

/** Per-request data read at the edge (headers/cookies) and provided by `runRequest`. */
export class RequestContext extends Context.Service<
  RequestContext,
  {
    readonly requestId: string;
  }
>()("app/RequestContext") {}
