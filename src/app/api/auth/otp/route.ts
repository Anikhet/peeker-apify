import { type NextRequest } from 'next/server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
	const { token, email, next } = await request.json();

	if (token && email) {
		const supabase = createClient();

		const { error } = await supabase.auth.verifyOtp({
			email,
			token: token,
			type: 'email',
		});
		if (!error) {
			if (next) {
				redirect(`/pro/${next}`);
			}
		}
	}

	// redirect the user to an error page with some instructions
	redirect('/404');
}
