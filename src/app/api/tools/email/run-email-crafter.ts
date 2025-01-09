'use server';

import { Tables } from '@/lib/supabase/database.types';
import { emailSchema } from '../schemas';
import { convertPayload, requestJob } from '../utils';

import { createClient } from '@/lib/supabase/server';
import { userStatus } from '@/components/user';
// import { RemapTiptap } from '@/components/app/campaign/tools/email/tiptap/remapTiptap';

export async function runEmail(props: { formData: FormData; datatableId: string; firstChunk: boolean }) {
	const { formData, datatableId, firstChunk = false } = props;
	const supabase = createClient();
	console.log(formData, datatableId, firstChunk);
	const email = JSON.parse(formData.get('email') as string);
	const generationId = formData.get('generationId') as string;
	console.log(email, generationId);
	const validatedFields = emailSchema.safeParse({ email, generationId });
	if (!validatedFields.success) {
		console.error('Failed to validate agent schema');
		return {
			errors: validatedFields.error.flatten().fieldErrors,
		};
	}

	// #############################################################################################################################
	// LOAD SUPA + DB
	// #############################################################################################################################
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error('Unauthorized');
	const status = await userStatus(user.id, supabase);

	// #############################################################################################################################
	// GET PARAM (OF PARENT)
	// #############################################################################################################################
	const form = validatedFields.data;
	if (!('generationId' in form && form.generationId != null)) throw new Error('No generationId found');
	const { data: paramsData, error: paramsError } = await supabase
		.from('generation_param')
		.select('id, name, group, billing_factor')
		.in('id', ['gen_email_subject', 'gen_email']);
	if (paramsError) throw paramsError;
	console.log('params', paramsData);

	// #############################################################################################################################
	// CREATE JOB
	// #############################################################################################################################
	const { data: jobs, error: jobsError } = await supabase
		.from('job')
		.insert(
			paramsData.map((param) => ({
				datatable_id: datatableId,
				display_name: `${param.name}`,
				generation_id: param.id,
				session_type: status === 'active' ? 'PRO' : 'FREE',
				payload: convertPayload(form),
			}))
		)
		.select();
	if (jobsError) throw jobsError;

	// #############################################################################################################################
	// CREATE NEW COLUMN
	// #############################################################################################################################

	// Create new column
	let newColumns = [];
	const { data: datatableData } = await supabase.from('datatable').select('columns').eq('id', datatableId).single();
	const currentColumns = (datatableData?.columns as any[]) || [];
	for (const [index, job] of jobs.entries()) {
		const param = paramsData.filter((param) => param.id === job.generation_id)[0];
		console.log('paramsDataFiltered', param);
		newColumns.push({ key: job.id, name: `${param.name}`, index: currentColumns.length + index });
	}

	await supabase
		.from('datatable')
		.update({
			columns: [...currentColumns, ...newColumns],
		})
		.eq('id', datatableId)
		.throwOnError();

	// #############################################################################################################################
	// CHECK & SET LIMIT
	// #############################################################################################################################
	const isPro = status === 'active';
	let creditsToBlock = 0;
	let count = 0;
	const { count: leadCount } = await supabase.from('lead').select('*', { count: 'exact', head: true }).eq('datatable_id', datatableId).throwOnError();
	count = leadCount || 0;

	if (!isPro && paramsData.some((param) => param.billing_factor > 0)) {
		const { data: ratelimit, error: ratelimitsError } = await supabase
			.from('user_ratelimit')
			.select('credits,credits_free_tier,credits_blocked')
			.eq('id', user.id)
			.single();
		if (ratelimitsError) throw ratelimitsError;
		const creditsAvailable = (ratelimit.credits || 0) + (ratelimit.credits_free_tier || 0) - (ratelimit.credits_blocked || 0);
		if (creditsAvailable <= 0) throw new Error('No credits available');
	}

	// #############################################################################################################################
	// #3 Process job
	// #############################################################################################################################
	for (const job of jobs) {
		const CONFIG_GCRUN_URL = 'https://core-run-queuer-314125185535.us-central1.run.app/job/' + job.generation_id;
		await fetch(CONFIG_GCRUN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ userId: user.id, job, firstChunk, generationId: job.generation_id, leadCount }),
		});
	}
	return { jobs };
}

export async function runEmailPreview(prompt: any, lead: Tables<'lead'>, broadcastId: string) {
	const GC_CF_URL = 'https://core-run-email-crafter-314125185535.us-central1.run.app/preview';
	const leadId = { id: lead.id };
	console.log(leadId);
	console.log(prompt);
	const response = await fetch(GC_CF_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ prompt, lead: leadId, broadcastId }),
	});
	return response.ok;
}
