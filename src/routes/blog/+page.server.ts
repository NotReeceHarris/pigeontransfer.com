import { client } from '$lib/server/cms';
import slugify from 'slugify';

export const load = async () => {

    const posts = await client.getEntries();

    return {
        posts: posts.items.map((post) => {

            const title = `${post.fields.title}`;
            const slug = slugify(title, { lower: true }).replace(/[^a-z0-9\-]/g, '');

            return {
                id: post.sys.id,
                title: title,
                description: post.fields.description,
                slug: slug
            }
        })
    }
    
};