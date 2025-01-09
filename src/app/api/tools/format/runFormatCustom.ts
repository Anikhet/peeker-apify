'use server';

import { requestJob } from '@/app/api/tools/utils';
import { formatSchema } from '../schemas';

export async function runFormatCustom(formData: FormData, campaignId: string) {
	const validatedFields = formatSchema.safeParse({
		generationId: formData.get('generationId'),
		prompt: formData.get('prompt'),
		field: formData.get('field'),
	});
	// Return early if the form data is invalid
	if (!validatedFields.success) {
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}
	const { jobs } = await requestJob(campaignId, validatedFields.data);
	return { jobs };
}
