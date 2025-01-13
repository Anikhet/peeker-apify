export function splitTextIntoKeyValuePairs(txt: string) {
	// Define the max key-value pairs and value length
	const maxKeyValuePairs = 40;
	const maxValueLength = 500;

	// Array to store key-value pairs
	const dict: Record<string, string> = {};

	// Keep track of the index for keys
	let index = 1;

	// Split the URL into chunks of maxValueLength
	for (let i = 0; i < txt.length; i += maxValueLength) {
		// Generate a key for each chunk, e.g., key1, key2, ..., key50
		const key = `split_key_${index}`;

		// Extract a chunk of maxValueLength from the URL
		const value = txt.substring(i, i + maxValueLength);

		// Add the key-value pair to the array
		dict[key] = value;

		// Increment the index for the next key
		index++;

		// If we reach the limit of maxKeyValuePairs, stop splitting
		if (index > maxKeyValuePairs) {
			break;
		}
	}

	return dict;
}

export function glueKeyValuePairs(keyValuePairs: Record<string, string>) {
	// Initialize an empty string to store the final URL
	let rebuilt = '';

	// filter out the keys that are not url_key
	const filteredKeys = Object.entries(keyValuePairs).filter(([key]) => key.includes('split_key_'));

	// Iterate over the key-value pairs
	filteredKeys.forEach(([, value]) => {
		// Concatenate the value from each pair to the rebuilt URL
		rebuilt += value;
	});

	return rebuilt;
}
