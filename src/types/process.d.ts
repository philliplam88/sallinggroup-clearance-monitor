declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: string;
    SALLING_API_TOKEN: string;
    // Pushvoer
    PUSHOVER_API_TOKEN: string;
    PUSHOVER_USER_KEY: string;
    // Monitor
    MONITOR_EANS: string;
    MONITOR_ZIP_CODE: string;
    MONITOR_DELAY_MS: string;
  }
}
