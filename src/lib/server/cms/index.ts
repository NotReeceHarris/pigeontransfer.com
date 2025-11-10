import * as contentful from 'contentful'
import { env } from '$env/dynamic/private';
const { CONTENTFUL_TOKEN, CONTENTFUL_SPACE } = env;

export const client = contentful.createClient({
    space: CONTENTFUL_SPACE,
    environment: 'master',
    accessToken: CONTENTFUL_TOKEN
})