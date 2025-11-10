import { client } from '$lib/server/cms';
import { redirect } from '@sveltejs/kit';
import slugify from 'slugify';

export const load = async ({ params }) => {

    if (!params.id) {
        redirect(307, '/blog');
    }

    const post = await client.getEntry(params.id);

    if (!post) {
        redirect(307, '/blog');
    }

    const title = `${post.fields.title}`;
    const slug = slugify(title, { lower: true }).replace(/[^a-z0-9\-]/g, '');

    redirect(307, `/blog/${params.id}/${slug}`);
};