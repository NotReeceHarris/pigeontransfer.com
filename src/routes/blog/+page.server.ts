import { client } from '$lib/server/cms';
import slugify from 'slugify';
import readingTime from 'reading-time';

export const load = async () => {

    const posts = await client.getEntries();

    return {
        posts: posts.items.map((post) => {

            const title = `${post.fields.title}`;
            const slug = slugify(title, { lower: true }).replace(/[^a-z0-9\-]/g, '');
            const image = post.fields.banner?.fields.file || null;

            return {
                id: post.sys.id,
                image: image,
                title: title,
                description: post.fields.description,
                slug: slug,
                created: post.sys.createdAt || null,
                updated: post.sys.updatedAt || null,
                readtime: readingTime(post.fields.content.toString()).text || '0 min read',
            }
        })
    }
    
};