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
                id: `usr${string}`;
                createdAt: string;
                createdBy: string | null;
                username: string;
                email: string | null;
                normalizedEmail: string | null;
                emailVerified: boolean | null;
                updatedAt: string;
                updatedBy: string | null;
                purrlons: number;
                wallets: {
                    type: "ETHEREUM";
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: `usr${string}`;
                    address: `0x${string}`;
                    chainId: 1 | 137 | 11155111 | 42161 | 10 | 8453 | 84532;
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
                id: `usr${string}`;
                createdAt: string;
                createdBy: string | null;
                username: string;
                email: string | null;
                normalizedEmail: string | null;
                emailVerified: boolean | null;
                updatedAt: string;
                updatedBy: string | null;
                purrlons: number;
                wallets: {
                    type: "ETHEREUM";
                    id: string;
                    createdAt: string;
                    updatedAt: string;
                    userId: `usr${string}`;
                    address: `0x${string}`;
                    chainId: 1 | 137 | 11155111 | 42161 | 10 | 8453 | 84532;
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
    battles: {
        $get: {
            input: {
                query: {
                    limit?: string | undefined;
                    page?: string | undefined;
                };
            };
            output: {
                battles: {
                    status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "WAITING";
                    id: `bat${string}`;
                    createdAt: string;
                    robots: {
                        name: string;
                        id: `rob${string}`;
                        imageUrl?: string | null | undefined;
                    }[];
                }[];
                page: number;
                total: number;
                totalPages: number;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "battle-events/:battleId": {
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
}, "/"> & import("hono/types").MergeSchemaPath<{
    "select-robot": {
        $post: {
            input: {
                json: {
                    robotId: `rob${string}`;
                };
            };
            output: {
                selectedRobotId: `rob${string}`;
                success: boolean;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "user-robots": {
        $get: {
            input: {};
            output: {
                robots: {
                    description: string;
                    name: string;
                    id: `rob${string}`;
                    createdAt: string;
                    prompt: string;
                }[];
                selectedRobotId: `rob${string}` | null;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "battle-status": {
        $get: {
            input: {
                query: {
                    battleId: `bat${string}`;
                };
            };
            output: {
                status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "WAITING";
                rounds: {
                    description: string;
                    roundNumber: number;
                }[];
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "start-battle": {
        $post: {
            input: {
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
}, "/"> & import("hono/types").MergeSchemaPath<{
    "join-battle": {
        $post: {
            input: {
                json: {
                    battleId: `bat${string}`;
                    robotId: `rob${string}`;
                };
            };
            output: {
                success: boolean;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "create-battle": {
        $post: {
            input: {
                json: {
                    robot1Id: `rob${string}`;
                };
            };
            output: {
                battleId: `bat${string}`;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/"> & import("hono/types").MergeSchemaPath<{
    "create-robot": {
        $post: {
            input: {
                json: {
                    prompt: string;
                };
            };
            output: {
                description: string;
                name: string;
                id: `rob${string}`;
                prompt: string;
            };
            outputFormat: "json";
            status: 200;
        };
    };
}, "/">, "/robot-battle">, "/">>;
export type RobotAPI = Awaited<ReturnType<typeof createRobotApi>>;
