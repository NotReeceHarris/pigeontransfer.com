import * as contentful from 'contentful'
import { CONTENTFUL_TOKEN, CONTENTFUL_SPACE } from '$env/static/private'

export const client = contentful.createClient({
    space: CONTENTFUL_SPACE,
    environment: 'master',
    accessToken: CONTENTFUL_TOKEN
})