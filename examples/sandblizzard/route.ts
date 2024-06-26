import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import {
    actionSpecOpenApiPostRequestBody,
    actionsSpecOpenApiGetResponse,
    actionsSpecOpenApiPostResponse,
} from '../openapi';
import {
    ActionsSpecErrorResponse,
    ActionsSpecGetResponse,
    ActionsSpecPostRequestBody,
    ActionsSpecPostResponse,
} from '../../spec/actions-spec';
import * as bountysdk from 'bounty-sdk';
import { PublicKey } from '@solana/web3.js';
import jupiterApi from '../jupiter-swap/jupiter-api';
import { BN } from 'bn.js';
import { connection } from '../transaction-utils';
import { json } from 'stream/consumers';
import { getFilePathWithoutDefaultDocument } from 'hono/utils/filepath';

export const SANDBLIZZARD_LOGO =
    'https://sandblizzard.one/sand-icon.png';


const app = new OpenAPIHono();

app.openapi(

    createRoute({
        method: 'get',
        path: '/link',
        tags: ['Link your github account'],
        request: {
            params: z.object({
            }),
        },
        responses: actionsSpecOpenApiGetResponse,
    }),
    async (c) => {




        const response: ActionsSpecGetResponse = {
            icon: SANDBLIZZARD_LOGO,
            label: `Link user `,
            title: `Link your  wallet and github account`,
            description: `By linking your wallet an github account you can solve github bounties in any repo`,
            links: {
                actions: [
                    {
                        href: `/api/sandblizzard/link/`,
                        label: `Create bounty`,
                        parameters: [
                            {
                                name: 'githubUser',
                                label: 'Github userid',
                            },
                        ],
                    },
                ],
            },
        };

        return c.json(response);
    },
);




app.openapi(

    createRoute({
        method: 'get',
        path: '/{token}',
        tags: ['Create Bounty'],
        request: {
            params: z.object({

                token: z.string().openapi({
                    param: {
                        name: 'token',
                        in: 'path',
                    },
                    type: 'string',
                    example: 'usdc',
                }),
            }),
        },
        responses: actionsSpecOpenApiGetResponse,
    }),
    async (c) => {
        console.log(c.req.url)
        // parse url query params
        const githubUrl = c.req.query('githubUrl');
        if (!githubUrl) {
            return Response.json(
                {
                    message: `Github URL is required.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }
        // parse githubUrl into organization and team based on the url
        const organization = githubUrl.split('/')[3];
        const team = githubUrl.split('/')[4];


        const token = c.req.param('token');
        if (!token) {
            return Response.json(
                {
                    message: `Token is required.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }

        const amountParameterName = 'amount';
        const response: ActionsSpecGetResponse = {
            icon: SANDBLIZZARD_LOGO,
            label: `Create bounty `,
            title: `Create bounty for ${team} in ${organization} `,
            description: `This will create a bounty on the github issue ${githubUrl} for ${token}`,
            links: {
                actions: [
                    {
                        href: `/api/sandblizzard/${token}/{${amountParameterName}}/${organization}/${team}`,
                        label: `Create bounty`,
                        parameters: [
                            {
                                name: amountParameterName,
                                label: `Token amount in ${token}`,
                            },
                        ],
                    },
                ],
            },
        };

        return c.json(response);
    },
);




app.openapi(
    createRoute({
        method: 'post',
        path: '/{token}/{amount}/{organization}/{team}',
        tags: ['Create bounty'],
        request: {
            params: z.object({
                amount: z
                    .string()
                    .optional()
                    .openapi({
                        param: {
                            name: 'amount',
                            in: 'path',
                            required: false,
                        },
                        type: 'number',
                        example: '1',
                    }),
                token: z.string().openapi({
                    param: {
                        name: 'token',
                        in: 'path',
                        required: false,
                    },
                    type: 'string',
                    example: 'USDC',
                }),
                organization: z.string().openapi({
                    param: {
                        name: 'organization',
                        in: 'path',
                        required: false,
                    },
                    type: 'string',
                    example: 'sandblizzard',
                }),
                team: z.string().openapi({
                    param: {
                        name: 'team',
                        in: 'path',
                        required: false,
                    },
                    type: 'string',
                    example: 'rewards-v2',
                }),

            }),
            body: actionSpecOpenApiPostRequestBody,
        },
        responses: actionsSpecOpenApiPostResponse,
    }),
    async (c) => {

        const tokenName = c.req.param('token');
        if (!tokenName) {
            return Response.json(
                {
                    message: `Token is required.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }
        const amount = c.req.param('amount')
        const organization = c.req.param('organization');
        if (!organization) {
            return Response.json(
                {
                    message: `organization is required.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }
        const team = c.req.param('team');
        if (!team) {
            return Response.json(
                {
                    message: `team is required.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }
        if (!amount) {
            return Response.json(
                {
                    message: `Amount is required.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }
        const { account } = (await c.req.json()) as ActionsSpecPostRequestBody;
        const inputToken = await jupiterApi.lookupToken(tokenName);
        if (!inputToken) {
            return Response.json(
                {
                    message: `Token metadata not found.`,
                } satisfies ActionsSpecErrorResponse,
                {
                    status: 422,
                },
            );
        }


        console.log(JSON.stringify(inputToken))
        // parse githubUrl into organization and team based on the url

        const bountySdk = new bountysdk.BountySdk(new PublicKey(account), connection);
        const res = await bountySdk.createBounty({
            id: 1,
            bountyAmount: new BN(amount),
            bountyCreator: new PublicKey(account),
            mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
            platform: "github",
            organization: organization,
            team: team,
            domainType: "github",
        });


        const response: ActionsSpecPostResponse = {
            transaction: res.vtx.serialize().toString(),
        };
        return c.json(response);
    },
);

export default app;
