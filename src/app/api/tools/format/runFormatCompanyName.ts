'use server';

import { requestJob } from '@/app/api/tools/utils';
import { formatSchema } from '../schemas';

export async function runFormatCompanyName(formData: FormData, campaignId: string) {
	console.log(formData);
	const validatedFields = formatSchema.safeParse({
		filter: formData.get('filter'),
		generationIds: JSON.parse(formData.get('generationIds') as string),
		field: formData.get('field'),
	});
	// Return early if the form data is invalid
	if (!validatedFields.success) {
		console.error('Form invalid');
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}
	const { jobs } = await requestJob(campaignId, validatedFields.data);
	return { jobs };
}
