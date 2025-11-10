import * as contentful from 'contentful'
import { env } from '$env/dynamic/private';

if (!env.CONTENTFUL_TOKEN) throw new Error('CONTENTFUL_TOKEN is not set');
if (!env.CONTENTFUL_SPACE) throw new Error('CONTENTFUL_SPACE is not set');

export const client = contentful.createClient({
    space: env.CONTENTFUL_SPACE,
    environment: 'master',
    accessToken: env.CONTENTFUL_TOKEN
})