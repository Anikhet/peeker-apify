import { type NextRequest } from 'next/server';

import { redirect } from 'next/navigation';

// import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
	const { token, email, next } = await request.json();
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

	if (token && email) {
		const supabase = createClient( supabaseUrl, supabaseAnonKey);

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
