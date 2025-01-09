'use server';

import { validateEmailSchema } from '../schemas';
import { requestJob } from '../utils';

type Props = {
	formData: FormData;
	campaignId: string;
	firstChunk: boolean;
};

export async function runValidateEmail({ formData, campaignId, firstChunk }: Props) {
	const validatedFields = validateEmailSchema.safeParse({
		field: formData.get('field'),
		filter: formData.get('filter'),
		generationIds: JSON.parse(formData.get('generationIds') as string),
	});
	// Return early if the form data is invalid
	if (!validatedFields.success) {
		console.error('validation error');
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}
	const { jobs } = await requestJob(campaignId, validatedFields.data, { batch: true });
	return { jobs };
}
