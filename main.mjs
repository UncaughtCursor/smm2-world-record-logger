import fs from 'fs';
import https from 'https';

const worldRecordDataPath = 'world-records.json';
const updatePeriodSec = 120; // Update levels once every two minutes

console.log('Starting SMM2 World Record Logger...');

// Load course IDs and current world record data
const courseIds = loadCourseIds();
const worldRecords = loadWorldRecords();
console.log('Loaded course IDs and world record data.');

const update = async () => {
	const startTime = Date.now();

	console.log('Updating world records...');
	const newWorldRecords = await getWorldRecords(courseIds);

	updateWorldRecords(worldRecords, newWorldRecords);
	saveJsonToFile(worldRecordDataPath, worldRecords);

	console.log('Saved new world records.');

	const timeTaken = Date.now() - startTime;

	// Only allow the next update to run after this update has finished
	// Perform the next update after the update period has passed,
	// subtracting the execution time of this update from the update period
	setTimeout(update, Math.max((updatePeriodSec * 1000) - timeTaken, 0));
};

update();

/**
 * Fetches the latest world record for the courses.
 * @param {string[]} courseIds The course ids to fetch the world records for.
 * @return {Promise<{courseId: string, worldRecordTime: number, recordHolderId: string, timeWhenRecorded: number}[]>} The world records.
 */
async function getWorldRecords(courseIds) {
	const url = `https://tgrcode.com/mm2/level_info_multiple/${courseIds.join(',')}?noCaching=1`;

	const data = await downloadJsonFromUrl(url);
	const worldRecords = data.courses.map(course => {
		const worldRecordTime = course.world_record;
		const recordHolderId = course.record_holder.code;
		const timeWhenRecorded = Date.now();
		return {
			courseId: course.course_id,
			worldRecordTime,
			recordHolderId,
			timeWhenRecorded,
		};
	});

	return worldRecords;
}

/**
 * Updates the world record data with the latest data.
 * @param {Record<string, {worldRecordTime: number, recordHolderId: string, timeWhenRecorded: number}[]>} worldRecordData The world record data to update.
 * This data is mutated.
 * @param {{courseId: string, worldRecordTime: number, recordHolderId: string, timeWhenRecorded: number}[]} newWorldRecords The latest world records to update with.
 */
function updateWorldRecords(worldRecordData, newWorldRecords) {
	newWorldRecords.forEach(newWorldRecord => {
		const courseId = newWorldRecord.courseId;

		if (!worldRecordData[courseId]) worldRecordData[courseId] = [];

		const existingRecordTime = worldRecordData[courseId].length > 0
			? worldRecordData[courseId][worldRecordData[courseId].length - 1].worldRecordTime
			: Infinity;

		if (newWorldRecord.worldRecordTime !== existingRecordTime) {
			const { worldRecordTime, recordHolderId, timeWhenRecorded } = newWorldRecord;
			worldRecordData[courseId].push({ worldRecordTime, recordHolderId, timeWhenRecorded });
		}
	});
}

/**
 * Loads the stored world record data from `world-records.json`.
 * This data is a set of key value pairs: courseId -> {worldRecord, recordHolderId, timeWhenRecorded}[].
 * @returns {Record<string, {worldRecordTime: number, recordHolderId: string, timeWhenRecorded: number}[]>} The world records.
 */
function loadWorldRecords() {
	return loadJsonFromFile(worldRecordDataPath);
}

/**
 * Loads the course IDs to get world records for from `course-ids.json`.
 * @returns {string[]} The array of course IDs.
 */
function loadCourseIds() {
	const courseIdPath = 'course-ids.json';
	const courseIds = loadJsonFromFile(courseIdPath, []); // Assumed to be of type string[]

	if (courseIds.length === 0) {
		throw new Error(`No course IDs found in ${courseIdPath}. Add course IDs to this file.`);
	}

	// Convert course IDs to format used for the API
	return courseIds.map(courseId => {
		const idWithoutDashes = courseId.replace(/-/g, '').toUpperCase();

		// Validate course ID
		if (idWithoutDashes.length !== 9 || idWithoutDashes.match(/[^ABCDEFGHJKLMNPQRSTUVWXY0123456789]/)) {
			throw new Error(`Invalid course ID: "${courseId}". Must be capitalized with dashes. Ex: "BCD-123-EFG"`);
		}

		return idWithoutDashes;
	});
}

/**
 * Loads JSON data from a file.
 * Creates the file if it doesn't exist.
 * @param {string} filePath Path to the file.
 * @param {any} defaultData The default data to save if the file doesn't exist.
 * @returns {any} The JSON data.
 */
function loadJsonFromFile(filePath, defaultData = {}) {
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
		return defaultData;
	}
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Saves JSON data to a file.
 * @param {string} filePath Path to the file.
 * @param {any} data The JSON data.
 */
function saveJsonToFile(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Downloads JSON data from a URL.
 * @param {string} url The URL to download from.
 * @returns {Promise<any>} A Promise that resolves to the JSON data.
 */
function downloadJsonFromUrl(url) {
	const maxTries = 10;
	const tryPeriodSec = 20;

	return new Promise(async (resolve, reject) => {
		for (let i = 0; i < maxTries; i++) {
			https.get(url, response => {
				if (response.statusCode !== 200) {
					console.error(`Request failed with status code ${response.statusCode}. Retrying...`);
				}
	
				let body = '';
				response.on('data', chunk => body += chunk);
				response.on('end', () => {
					try {
						resolve(JSON.parse(body));
					} catch (e) {
						console.error(`Failed to parse JSON data from ${url}. Instead got:\n${body}\nRetrying...`);
					}
				});
			});
			if (i < maxTries - 1) await sleep(tryPeriodSec * 1000);
		}
		reject(new Error(`Failed to download JSON data from ${url} after ${maxTries} tries.`));
	});
}

/**
 * Pauses the current thread for a given number of milliseconds.
 * @param {number} ms The number of milliseconds to sleep.
 * @returns {Promise<void>} A Promise that resolves when the sleep is complete.
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}