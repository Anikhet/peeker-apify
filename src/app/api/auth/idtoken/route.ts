import { type NextRequest } from 'next/server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
	const { credential, next } = await request.json();

	if (credential) {
		const supabase = createClient();

		console.log('credential', credential);

		const { error } = await supabase.auth.signInWithIdToken({
			provider: 'google',
			token: credential,
		});
		if (error) {
			console.error('error', error);
		}
		if (!error) {
			if (next) {
				redirect(`/pro/${next}`);
			} else {
				redirect('/');
			}
		}
	}

	// redirect the user to an error page with some instructions
	redirect('/404');
}
