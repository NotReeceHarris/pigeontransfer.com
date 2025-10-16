export const load = async ({ params }) => {

    const code = params.code;

    if (!code || code.length !== 6) {
        return {
            error: 'invalid-code'
        };
    }


    return {
        code: params.code
    };
};