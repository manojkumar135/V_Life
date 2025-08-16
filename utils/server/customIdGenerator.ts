import { Model } from "mongoose";

/**
 * Generates a random digit string between minDigits and maxDigits in length.
 * @param minDigits Minimum number of digits (e.g., 6)
 * @param maxDigits Maximum number of digits (e.g., 8)
 * @returns A numeric string (e.g., "439201")
 */
function generateRandomDigits(minDigits: number, maxDigits: number): string {
    const length = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
    let result = "";
    result += Math.floor(Math.random() * 9) + 1; // First digit: 1–9
    for (let i = 1; i < length; i++) {
        result += Math.floor(Math.random() * 10); // Next digits: 0–9
    }
    return result;
}

/**
 * Generates a custom_id string using a given prefix and random digits.
 * @param prefix Prefix for ID (e.g., "U", "GR")
 * @param minDigits Minimum number of digits
 * @param maxDigits Maximum number of digits
 * @returns A custom ID (e.g., "AD439201")
 */
function generateCustomId(prefix: string, minDigits: number, maxDigits: number): string {
    return `${prefix}${generateRandomDigits(minDigits, maxDigits)}`;
}

/**
 * Generates a unique custom_id for any entity using a prefix and Mongoose model.
 * Retries until a unique ID is found or maxAttempts is reached.
 *
 * @param prefix Prefix for the custom ID (e.g., "AD", "MG")
 * @param Model Mongoose model (Admin, Manager, etc.)
 * @param minDigits Minimum number of digits
 * @param maxDigits Maximum number of digits
 * @param maxAttempts Maximum number of retries
 * @returns Resolves to a unique custom_id
 */
async function generateUniqueCustomId<T extends { custom_id: string }>(
    prefix: string,
    Model: Model<T>,
    minDigits: number = 6,
    maxDigits: number = 8,
    maxAttempts: number = 10
): Promise<string> {
    let custom_id: string;
    let attempts = 0;

    while (attempts < maxAttempts) {
        custom_id = generateCustomId(prefix, minDigits, maxDigits);
        try {
            const exists = await Model.findOne({ custom_id });
            if (!exists) return custom_id;
            console.warn(`[Custom ID Generator] Duplicate ID (${custom_id}) found for ${prefix}. Retrying...`);
        } catch (err) {
            console.error(`[Custom ID Generator] Error checking ${prefix} custom_id:`, err);
            throw new Error(`Error checking ${prefix} ID uniqueness.`);
        }
        attempts++;
    }

    throw new Error(`Could not generate unique ${prefix} ID after ${maxAttempts} attempts.`);
}

export { generateRandomDigits, generateCustomId, generateUniqueCustomId };
