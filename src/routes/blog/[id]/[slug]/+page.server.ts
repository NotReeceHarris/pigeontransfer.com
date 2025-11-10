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

    if (params.slug !== slug) {
        redirect(307, `/blog/${params.id}/${slug}`);
    }

    if (!post.fields.content) {
        redirect(307, '/blog');
    }

    return {
        post: {
            id: post.sys.id,

            banner: post.fields.banner?.fields || null,
            title: title,
            description: post.fields.description?.toString() || '',
            content: post.fields.content.toString(),

            aiDetails: {
                isAiGenerated: post.fields.aiGenerated || false,
                isAiEnhanced: post.fields.aiEnhanced || false,
                aiTools: `${post.fields.aiTools}`
            }
        }
    }
};