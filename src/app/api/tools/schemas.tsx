import { Tables } from '@/lib/supabase/database.types';
import { z } from 'zod';

export const agentSchema = z.object({
	agent: z.record(z.any(), z.any()),
	generationIds: z.array(z.string()),
});

export const emailSchema = z.object({
	email: z.record(z.any(), z.any()),
	generationIds: z.array(z.string()),
});

export const validateEmailSchema = z.object({
	field: z.string(),
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	generationIds: z.array(z.string()),
});

export const formatSchema = z.object({
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	field: z.string(),
	generationIds: z.array(z.string()),
});

export const formatCompanyNameSchema = z.object({
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	field: z.string(),
	generationIds: z.array(z.string()),
});

export const formatJobTitleSchema = z.object({
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	field: z.string(),
	generationIds: z.array(z.string()),
});

export const formatDomainNameSchema = z.object({
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	field: z.string(),
	generationIds: z.array(z.string()),
});

export const formatPhoneNumberSchema = z.object({
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	field: z.string(),
	generationIds: z.array(z.string()),
});

export const formatTextSpacingSchema = z.object({
	filter: z
		.enum(['true', 'false'])
		.transform((value) => value === 'true')
		.default('true'),
	field: z.string(),
	generationIds: z.array(z.string()),
});

export const formatCustomSchema = z.object({
	mappingCustom: z.string(),
	generationIds: z.array(z.string()),
	prompt: z.string(),
});
