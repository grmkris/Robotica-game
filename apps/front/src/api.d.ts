import type { Logger } from "cat-logger";
export declare const createRobotApi: (props: {
    logger: Logger;
}) => Promise<import("hono/hono-base").HonoBase<{
    Variables: import("./types").ContextVariables;
}, ({
    "/swagger": {
        $get: {
            input: {};
            output: {};
            outputFormat: "json";
            status: import("hono/utils/http-status").StatusCode;
        };
    };
} & {
    "/": {
        $get: {
            input: {};
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        } | {
            input: {};
            output: {};
            outputFormat: string;
            status: import("hono/utils/http-status").StatusCode;
        };
    };
}) | import("hono/types").MergeSchemaPath<import("hono/types").MergeSchemaPath<{
    "siwe/verify": {
        $post: {
            input: {
                json: {
                    message: string;
                    signature: string;
                };
            };
            output: {
                ok: boolean;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "siwe/nonce": {
        $get: {
            input: {};
            output: {
                nonce: string;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "change-password": {
        $post: {
            input: {
                json: {
                    currentPassword: string;
                    newPassword: string;
                };
            };
            output: {
                message: "Password changed successfully";
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    me: {
        $put: {
            input: {
                json: {
                    password?: string | undefined;
                    name?: string | null | undefined;
                    username?: string | undefined;
                    email?: string | null | undefined;
                    role?: "USER" | "ADMIN" | undefined;
                };
            };
            output: {};
            outputFormat: string;
            status: 401;
        } | {
            input: {
                json: {
                    password?: string | undefined;
                    name?: string | null | undefined;
                    username?: string | undefined;
                    email?: string | null | undefined;
                    role?: "USER" | "ADMIN" | undefined;
                };
            };
            output: {
                id: `user${string}`;
                createdBy: string | null;
                createdAt: string;
                username: string;
                email: string | null;
                normalizedEmail: string | null;
                emailVerified: boolean | null;
                updatedAt: string;
                updatedBy: string | null;
                purrlons: number;
                wallets: {
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: `user${string}`;
                    address: string;
                }[];
                name?: string | null | undefined;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    me: {
        $get: {
            input: {};
            output: {};
            outputFormat: string;
            status: 401;
        } | {
            input: {};
            output: {
                id: `user${string}`;
                createdBy: string | null;
                createdAt: string;
                username: string;
                email: string | null;
                normalizedEmail: string | null;
                emailVerified: boolean | null;
                updatedAt: string;
                updatedBy: string | null;
                purrlons: number;
                wallets: {
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: `user${string}`;
                    address: string;
                }[];
                name?: string | null | undefined;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    logout: {
        $get: {
            input: {
                query: {
                    redirect?: boolean | undefined;
                };
            };
            output: {};
            outputFormat: string;
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    login: {
        $post: {
            input: {
                json: {
                    password: string;
                    email: string;
                };
            };
            output: {};
            outputFormat: string;
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<import("hono/types").MergeSchemaPath<{
    "register/username": {
        $post: {
            input: {
                json: {
                    password: string;
                    username: string;
                };
            };
            output: {
                id: `user${string}`;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "register/verify": {
        $post: {
            input: {
                json: {
                    password: string;
                    email: string;
                    confirmationCode: string;
                };
            };
            output: {};
            outputFormat: string;
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "register/send-registration-code": {
        $post: {
            input: {
                json: {
                    email: string;
                    agree: boolean;
                };
            };
            output: {
                id: `user${string}`;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/">, "/">, "/auth"> | import("hono/types").MergeSchemaPath<import("hono/types").MergeSchemaPath<{
    "/generate-claim-signature": {
        $post: {
            input: {
                json: {
                    amount: string;
                    gameId: number;
                    userAddress: string;
                };
            };
            output: {
                signature: string;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/claim-signature"> & import("hono/types").MergeSchemaPath<{
    "/generate-game-signature": {
        $post: {
            input: {
                json: {
                    gameId: number;
                    userAddress: string;
                };
            };
            output: {
                signature: string;
            };
            outputFormat: "json";
            status: 200;
        } | {
            input: {
                json: {
                    gameId: number;
                    userAddress: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: {
                    gameId: number;
                    userAddress: string;
                };
            };
            output: {
                message: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/game-signature"> & import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {
                query: {
                    limit?: string | undefined;
                    page?: string | undefined;
                };
            };
            output: {
                battles: {
                    status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "WAITING" | "FAILED";
                    id: `bat${string}`;
                    createdBy: `user${string}`;
                    createdAt: string;
                    completedAt: string | null;
                    robots: {
                        id: `rob${string}`;
                        name: string;
                        imageUrl?: string | null | undefined;
                    }[];
                    gameId: number;
                }[];
                page: number;
                total: number;
                totalPages: number;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/battles"> & import("hono/types").MergeSchemaPath<{
    ":battleId/events": {
        $get: {
            input: {
                param: {
                    battleId: `bat${string}`;
                };
            };
            output: Response;
            outputFormat: "json";
            status: import("hono/utils/http-status").StatusCode;
        };
    };
}, "/battles"> & import("hono/types").MergeSchemaPath<{
    ":battleId/start": {
        $post: {
            input: {
                param: {
                    battleId: `bat${string}`;
                };
            } & {
                json: {
                    robot1Id: `rob${string}`;
                    robot2Id: `rob${string}`;
                };
            };
            output: {
                battleId: `bat${string}`;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/battles"> & import("hono/types").MergeSchemaPath<{
    ":battleId/join": {
        $post: {
            input: {
                param: {
                    battleId: `bat${string}`;
                };
            } & {
                json: {
                    gameId: number;
                    robotId: `rob${string}`;
                };
            };
            output: {
                battleId: `bat${string}`;
                gameId: number;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/battles"> & import("hono/types").MergeSchemaPath<{
    ":battleId": {
        $get: {
            input: {
                param: {
                    battleId: `bat${string}`;
                };
            };
            output: {
                status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "WAITING" | "FAILED";
                id: `bat${string}`;
                createdBy: `user${string}`;
                createdAt: string;
                winnerId: `rob${string}` | null;
                startedAt: string;
                completedAt: string | null;
                robots: {
                    id: `rob${string}`;
                    name: string;
                }[];
                gameId: number;
                rounds: {
                    description: string;
                    id: `rnd${string}`;
                    winnerId: `rob${string}` | null;
                    roundNumber: number;
                    tacticalAnalysis: string;
                    imageUrl: string | null;
                }[];
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/battles"> & import("hono/types").MergeSchemaPath<{
    "create-battle": {
        $post: {
            input: {
                json: {
                    robot1Id: `rob${string}`;
                };
            };
            output: {
                battleId: `bat${string}`;
                gameId: number;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/battles"> & import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {};
            output: {
                robots: {
                    description: string;
                    id: `rob${string}`;
                    name: string;
                    prompt: string;
                    createdBy: `user${string}`;
                    createdAt: string;
                    imageUrl?: string | null | undefined;
                }[];
                selectedRobotId: `rob${string}` | null;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/robots"> & import("hono/types").MergeSchemaPath<{
    "create-robot": {
        $post: {
            input: {
                json: {
                    prompt: string;
                };
            };
            output: {
                description: string;
                id: `rob${string}`;
                name: string;
                prompt: string;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/robots">, "/robot-battle">, "/">>;
export type RobotAPI = Awaited<ReturnType<typeof createRobotApi>>;
