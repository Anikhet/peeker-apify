import { userStatus } from '@/components/user';
import { Tables } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { count } from 'console';

type Props = {
	campaignId: string;
	form: Record<string, any>;
	isPro: boolean;
	userId: string;
	jobId: string;
};

export function convertPayload(form: Record<string, any>) {
	let payload: Record<string, string | string[] | Record<string, string[]>> = {};
	if ('agent' in form) {
		payload = form.agent;
	}

	if ('email' in form) {
		payload = form.email;
	}

	if ('prompt' in form) {
		payload['prompt'] = form.prompt;
	}

	if ('dependsOnId' in form) {
		payload['dependsOnId'] = form.dependsOnId;
	}

	if ('newDateFormat' in form) {
		payload['newDateFormat'] = form.newDateFormat;
	}

	return payload;
}

type RequestJobProps = {
	firstChunk?: boolean;
	// generationId: string;
	// isProRequested: boolean;
	payload?: Record<string, unknown> | undefined;
	batch?: boolean;
};

export async function requestJob(datatableId: string, form: Record<string, any>, props?: RequestJobProps): Promise<{ jobs: Tables<'job'>[] }> {
	try {
		const supabase = createClient();
		const generation_ids = form.generationIds;

		// #############################################################################################################################
		// LOAD SUPA + DB
		// #############################################################################################################################
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error('Unauthorized');
		const status = await userStatus(user.id, supabase);

		// #############################################################################################################################
		// GET PARAM
		// #############################################################################################################################
		if (!('generationIds' in form && form.generationIds != null)) throw new Error('No generationId found');
		const { data: paramsData, error: paramsError } = await supabase
			.from('generation_param')
			.select('id, name, group, billing_factor')
			.in('id', generation_ids);
		if (paramsError) throw paramsError;
		console.log('params', paramsData);

		// #############################################################################################################################
		// DATATABLE
		// #############################################################################################################################
		const { data: datatable, error: datatableError } = await supabase
			.from('datatable')
			.select('filter_config, sort_config')
			.eq('id', datatableId)
			.single()
			.throwOnError();
		if (datatableError) throw new Error('Campaign not found');

		const filterConfig = datatable.filter_config as { key: string; condition: string; value: string }[] | null;
		const sortConfig = datatable.sort_config as { [key: string]: boolean } | null;

		// #############################################################################################################################
		// CHECK & SET LIMIT
		// #############################################################################################################################
		const isPro = status === 'active';
		const { count: leadCount } = await supabase
			.rpc(
				'leads',
				{
					datatable_id: datatableId,
					filter_config: filterConfig && filterConfig.length ? filterConfig : null,
					sort_config: sortConfig && sortConfig ? sortConfig : null,
				},
				{ count: 'exact', head: true }
			)
			.throwOnError();

		console.log('lead_count', leadCount);
		let limit = 50_000;

		if (!isPro && paramsData.some((param) => param.billing_factor > 0)) {
			const { data: ratelimit, error: ratelimitsError } = await supabase
				.from('user_ratelimit')
				.select('credits, credits_free_tier')
				.eq('id', user.id)
				.single();
			if (ratelimitsError) throw ratelimitsError;
			const creditsAvailable = (ratelimit.credits || 0) + (ratelimit.credits_free_tier || 0);
			if (creditsAvailable <= 0) throw new Error('No credits available');
			limit = Math.min(creditsAvailable, limit);
		}

		limit = Math.min(leadCount || 0, limit);

		// #############################################################################################################################
		// GET CONFIGS AND CREATE JOB
		// #############################################################################################################################
		const { data: jobs, error: jobsError } = await supabase
			.from('job')
			.insert(
				paramsData.map((param) => ({
					datatableId: datatableId,
					display_name: `${param.name}`,
					generation_id: param.id,
					session_type: status === 'active' ? 'PRO' : 'FREE',
					payload: convertPayload(form),
					filter_config: filterConfig && filterConfig.length ? filterConfig : null,
					sort_config: sortConfig && sortConfig ? sortConfig : null,
					field_config: form.field,
					user_limit: limit,
				}))
			)
			.select();
		if (jobsError) throw jobsError;

		// #############################################################################################################################
		// CREATE NEW COLUMN
		// #############################################################################################################################
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
		// #3 Process job
		// #############################################################################################################################
		for (const job of jobs) {
			const suffix = props && props.batch ? 'bulk/' + job.generation_id : job.generation_id;
			const CONFIG_GCRUN_URL = 'https://core-run-queuer-314125185535.us-central1.run.app/job/' + suffix;
			await fetch(CONFIG_GCRUN_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ userId: user.id, job, isPro, isFirstChunk: props?.firstChunk, generationId: job.generation_id, limit }),
			});

			// #############################################################################################################################
			// #4 INSERT INTO TRACKER
			// #############################################################################################################################
			await supabase.rpc('bulk_insert_tracker', {
				datatable_id: datatableId,
				filter_config: filterConfig && filterConfig.length ? filterConfig : null,
				sort_config: sortConfig && sortConfig ? sortConfig : null,
				count: limit,
				job_id: job.id,
			});
		}

		return { jobs };
	} catch (e) {
		console.error(e);
		throw e;
	}
}

// export async function prepareJob(props: Props) {
// 	const { campaignId, form, isPro, userId, jobId } = props;
// 	const supabase = createClient();

// 	/* GET PARAM ************************************************************************************** */
// 	if (!('generationId' in form && form.generationId != null)) throw new Error('No generationId found');
// 	const { data: param, error: paramError } = await supabase
// 		.from('generation_param')
// 		.select('id, name, group, billing_factor')
// 		.eq('id', form.generationId)
// 		.single();
// 	if (paramError) throw paramError;

// 	/* GET JOB COUNT FOR DISPLAY NAME ****************************************************************** */
// 	const { count: jobCount } = await supabase
// 		.from('job')
// 		.select('*', { count: 'exact', head: true })
// 		.eq('campaign_id', campaignId)
// 		.eq('generation_id', param.id);

// 	const { data: jobUpdated, error: jobError } = await supabase
// 		.from('job')
// 		.update({
// 			display_name: `${param.name}${jobCount && jobCount > 0 ? ` ${jobCount}` : ''}`,
// 			payload: convertPayload(form),
// 		})
// 		.eq('id', jobId)
// 		.select()
// 		.single()
// 		.throwOnError();
// 	if (jobError) throw jobError;

// 	// Create new column
// 	await supabase.rpc('append_column', {
// 		campaign_id: campaignId,
// 		col: { key: jobId, name: `${param.name}${jobCount && jobCount > 0 ? ` ${jobCount}` : ''}`, index: 0 },
// 	});

// 	/* CHECK & SET LIMIT ******************************************************************************* */
// 	let creditsToBlock = 0;
// 	let count = 0;
// 	const { count: countLeads } = await supabase.from('vw_lead').select('*', { count: 'exact', head: true }).eq('campaign_id', campaignId).throwOnError();
// 	count = countLeads || 0;
// 	if (!isPro && param.billing_factor > 0) {
// 		const { data: ratelimit, error: ratelimitsError } = await supabase
// 			.from('user_ratelimit')
// 			.select('credits,credits_free_tier,credits_blocked')
// 			.eq('id', userId)
// 			.single();
// 		if (ratelimitsError) throw ratelimitsError;
// 		const creditsAvailable = (ratelimit.credits || 0) + (ratelimit.credits_free_tier || 0) - (ratelimit.credits_blocked || 0);
// 		if (creditsAvailable <= 0) throw new Error('No credits available');
// 		creditsToBlock = Math.min(param.billing_factor * count, creditsAvailable);
// 		// Function to adjust creditsAvailable until it is divisible by billing_factor
// 		while (creditsToBlock % param.billing_factor !== 0) {
// 			creditsToBlock--;
// 		}
// 	}

// 	const limit = !isPro && param.billing_factor > 0 ? Math.floor(creditsToBlock / param.billing_factor) : count;
// 	await supabase.from('job').update({ credits_blocked: 0, user_limit: limit }).eq('id', jobId).throwOnError();

// 	return { limit };
// }
