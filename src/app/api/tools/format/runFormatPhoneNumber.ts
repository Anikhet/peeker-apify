'use server';

import { requestJob } from '@/app/api/tools/utils';
import { formatSchema } from '../schemas';

export async function runFormatPhoneNumber(formData: FormData, campaignId: string) {
	console.log(formData.get('filter'));
	console.log(formData.get('generationId'));
	console.log(formData.get('mappingPhoneNumber'));

	const validatedFields = formatSchema.safeParse({
		filter: formData.get('filter'),
		generationId: formData.get('generationId'),
		field: formData.get('field'),
	});
	// Return early if the form data is invalid
	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}
	console.log(validatedFields);
	const { jobs } = await requestJob(campaignId, validatedFields.data);
	return { jobs };
}
