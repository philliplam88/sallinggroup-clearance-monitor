import "./env.js";

// utils
import { sendNotification, fetchClearance, wait, logger, handle, startOfDay, fDate } from "./utils.js";

const MONITOR_DELAY = Number(process.env.MONITOR_DELAY_MS);

const SEEN_OFFER_EANS = new Set<string>();
const MONITOR_EANS = new Set<string>(process.env.MONITOR_EANS ? process.env.MONITOR_EANS.split(",") : []);

function resetSeenEans() {
  return setTimeout(() => {
    logger.info(undefined, `Cleaning ${SEEN_OFFER_EANS.size} seen offer eans.`);
    SEEN_OFFER_EANS.clear();
    resetSeenEans();
  }, startOfDay());
}

async function startMonitor() {
  /* Start reset eans cycle */
  resetSeenEans();

  /* Monitor loop */
  while (true) {
    await monitorClearanceItems();
    await wait(MONITOR_DELAY);
  }
}

async function monitorClearanceItems() {
  try {
    const [error, stores] = await handle(fetchClearance(process.env.MONITOR_ZIP_CODE));

    if (error) return logger.error(error.message, `Failed to fetch clearance.`);

    for await (const store of stores) {
      for await (const clearance of store.clearances) {
        const { stock, lastUpdate, startTime, newPrice, discount, originalPrice, percentDiscount, ean: offerEan } = clearance.offer;
        const { ean: productEan, description, image } = clearance.product;
        const { name: storeName, address } = store.store;

        const isPresentDay = new Date(startTime).toDateString() === new Date().toDateString();

        if (MONITOR_EANS.has(productEan) && stock > 0 && isPresentDay) {
          if (!SEEN_OFFER_EANS.has(offerEan)) {
            SEEN_OFFER_EANS.add(offerEan);

            const title = `"${description}" product created! ✅`;
            const message = `🏪 Store: ${storeName}\n📍 Address ${address.street}, ${address.zip} ${
              address.city
            }\n📦 Stock: ${stock}\n🏷️ Price: ${newPrice} (${originalPrice}) DKK\n🕗 Created At: ${fDate(startTime)}`;

            logger.info({ storeName, stock }, `New product! ${description}`);

            // logger.warn({ storeName, product: description, stock, price: originalPrice, startTime }, title);

            const [error, _] = await handle(sendNotification(title, message, image));

            if (error) {
              logger.error(error.message, `Failed to send notification.`);
              continue;
            }
          }
        }
        continue;
      }
      continue;
    }

    logger.info(`Completed monitoring for ${stores.length} stores!`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : error, `Failed to monitor clearance.`);
  }
}

async function init() {
  if (!MONITOR_EANS.size) {
    logger.fatal(undefined, `No "MONITOR_EANS" specified to monitor. Please update the .env file. Exiting...`);
    return process.exit(0);
  }

  logger.info(
    {
      stage: process.env.NODE_ENV || "development",
      monitor_eans_count: MONITOR_EANS.size,
      monitor_delay: Number(process.env.MONITOR_DELAY_MS),
      monitor_zip_code: process.env.MONITOR_ZIP_CODE,
    },
    `Starting monitor...`
  );

  startMonitor();
}

init();
