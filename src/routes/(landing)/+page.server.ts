import type { Actions } from './$types';
import { PUBLIC_MAX_FILE_SIZE } from '$env/static/public';

const MAX_UPLOAD_SIZE = parseInt(PUBLIC_MAX_FILE_SIZE);

export const actions = {
	create: async ({ request }) => {
		const formData = await request.formData();

        const name = formData.get('name');
        const size = formData.get('size') ? Number(formData.get('size')) : null;
        const type = formData.get('type');
        const checksum = formData.get('checksum');

        if (!name || !size || !type || !checksum) {
            return { success: false, error: 'Missing required fields' };
        }

        if (size > MAX_UPLOAD_SIZE) {
            return { success: false, error: `File size exceeds the maximum limit of ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB.` };
        }

        console.log(formData);

        return { success: true };

	}
} satisfies Actions;