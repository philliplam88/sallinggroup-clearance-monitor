import { request } from "undici";
import pino from "pino/pino.js";
// types
import { FoodwasteResponse } from "./types/foodwaste.js";

/* Request func */

export async function sendNotification(title: string, message: string, imageUrl: string) {
  const imageRes = await request(imageUrl);

  const formData = new FormData();

  formData.append("token", process.env.PUSHOVER_API_TOKEN);
  formData.append("user", process.env.PUSHOVER_USER_KEY);
  formData.append("message", message);
  formData.append("title", title);
  formData.append("attachment", (await imageRes.body.blob()) as unknown as Blob, "food.jpg");
  formData.append("ttl", "21600"); // 6 hours

  const notifRes = await request("https://api.pushover.net/1/messages.json", {
    method: "POST",
    // @ts-expect-error
    body: formData,
  });

  const notifStatus = notifRes.statusCode;

  if (notifStatus !== 200) throw new Error(`Failed to send notification. Status code: ${notifStatus}`);

  return;
}

export async function fetchClearance(zip_code: string) {
  const { body, statusCode } = await request(`https://api.sallinggroup.com/v1/food-waste/?zip=${zip_code}`, {
    method: "GET",
    headers: {
      authorization: `bearer ${process.env.SALLING_API_TOKEN}`,
      "user-agent": "Mozilla/5.0 (Linux; Android 12; Pixel 5 Build/SP1A.210812.015; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.130 Mobile Safari/537.36",
      accept: "application/json",
      "x-requested-with": "dk.dsg.netto",
      referer: "https://www.netto.dk/",
      "accept-language": "da,en-US;q=0.9,en;q=0.8",
    },
  });

  if (statusCode !== 200) throw new Error(`Failed to fetch clearance. Status code: ${statusCode}`);

  const response = (await body.json()) as FoodwasteResponse;

  return response;
}

/* Utils func */

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function handle<T, U = Error>(promise: Promise<T>, errorExt?: object): Promise<[U, undefined] | [null, T]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[U, undefined]>((err: U) => {
      if (errorExt) {
        const parsedError = Object.assign({}, err, errorExt);
        return [parsedError, undefined];
      }

      return [err, undefined];
    });
}

export const logger = pino.default({
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
    level: "debug",
  }),
  base: undefined,
});

export function startOfDay() {
  // Calculate the milliseconds until the next day starts (midnight)
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  return nextDay.getTime() - now.getTime();
}

export function fDate(timestamp: string) {
  const formatOptions = { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", timeZoneName: "short" } as const;
  return new Date(timestamp).toLocaleString("en-US", { ...formatOptions, timeZone: "Europe/Copenhagen" });
}
