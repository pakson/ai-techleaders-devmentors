/** Base class for expected, domain-level errors. Carries a stable machine-readable `code`. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string = "APP_ERROR",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Raised when required configuration (usually an environment variable) is missing or invalid. */
export class ConfigError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "CONFIG_ERROR", options);
  }
}
