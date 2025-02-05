import type { Logger } from "cat-logger";
export declare const createCatApi: (props: { logger: Logger }) => Promise<
  import("hono/hono-base").HonoBase<
    {
      Variables: import("./types").ContextVariables;
    },
    | ({
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
          $get:
            | {
                input: {};
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
              }
            | {
                input: {};
                output: {};
                outputFormat: string;
                status: import("hono/utils/http-status").StatusCode;
              };
        };
      })
    | import("hono/types").MergeSchemaPath<
        import("hono/types").MergeSchemaPath<
          {
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
          },
          "/"
        > &
          import("hono/types").MergeSchemaPath<
            {
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
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
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
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              me: {
                $put:
                  | {
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
                    }
                  | {
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
                        username: string;
                        email: string | null;
                        normalizedEmail: string | null;
                        emailVerified: boolean | null;
                        createdAt: string;
                        createdBy: string | null;
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
                          chainId:
                            | 1
                            | 137
                            | 11155111
                            | 42161
                            | 10
                            | 8453
                            | 84532;
                        }[];
                        catUserAffections: {
                          id: `cua${string}`;
                          updatedAt: string;
                          userId: `usr${string}`;
                          catId: `cat${string}`;
                          affection: number;
                        }[];
                        name?: string | null | undefined;
                      };
                      outputFormat: "json";
                      status: 200;
                    };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              me: {
                $get:
                  | {
                      input: {};
                      output: {};
                      outputFormat: string;
                      status: 401;
                    }
                  | {
                      input: {};
                      output: {
                        id: `usr${string}`;
                        username: string;
                        email: string | null;
                        normalizedEmail: string | null;
                        emailVerified: boolean | null;
                        createdAt: string;
                        createdBy: string | null;
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
                          chainId:
                            | 1
                            | 137
                            | 11155111
                            | 42161
                            | 10
                            | 8453
                            | 84532;
                        }[];
                        catUserAffections: {
                          id: `cua${string}`;
                          updatedAt: string;
                          userId: `usr${string}`;
                          catId: `cat${string}`;
                          affection: number;
                        }[];
                        name?: string | null | undefined;
                      };
                      outputFormat: "json";
                      status: 200;
                    };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
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
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
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
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            import("hono/types").MergeSchemaPath<
              {
                "register/username": {
                  $post: {
                    input: {
                      json: {
                        password: string;
                        username: string;
                      };
                    };
                    output: {
                      id: `usr${string}`;
                    };
                    outputFormat: "json";
                    status: 200;
                  };
                };
              },
              "/"
            > &
              import("hono/types").MergeSchemaPath<
                {
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
                },
                "/"
              > &
              import("hono/types").MergeSchemaPath<
                {
                  "register/send-registration-code": {
                    $post: {
                      input: {
                        json: {
                          email: string;
                          agree: boolean;
                        };
                      };
                      output: {
                        id: `usr${string}`;
                      };
                      outputFormat: "json";
                      status: 200;
                    };
                  };
                },
                "/"
              >,
            "/"
          >,
        "/auth"
      >
    | import("hono/types").MergeSchemaPath<
        import("hono/types").MergeSchemaPath<
          {
            "misha-leaderboard": {
              $get: {
                input: {
                  query: {
                    catId: `cat${string}`;
                  };
                };
                output: {
                  username: string;
                  userId: `usr${string}`;
                  affectionLevel: number;
                  rank: number;
                }[];
                outputFormat: "json";
                status: 200;
              };
            };
          },
          "/"
        > &
          import("hono/types").MergeSchemaPath<
            {
              interactions: {
                $get: {
                  input: {
                    query: {
                      catId: `cat${string}`;
                      userId?: `usr${string}` | undefined;
                      page?: number | undefined;
                      pageSize?: number | undefined;
                    };
                  };
                  output: {
                    interactions: {
                      type:
                        | "AUTONOMOUS_THOUGHT"
                        | "PET"
                        | "FEED"
                        | "PLAY"
                        | "CHAT";
                      status:
                        | "PENDING"
                        | "PROCESSING"
                        | "VALIDATION_FAILED"
                        | "COMPLETED"
                        | "FAILED";
                      user: {
                        id: `usr${string}`;
                        username: string;
                        email: string | null;
                        normalizedEmail: string | null;
                        emailVerified: boolean | null;
                        createdAt: string;
                        createdBy: string | null;
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
                          chainId:
                            | 1
                            | 137
                            | 11155111
                            | 42161
                            | 10
                            | 8453
                            | 84532;
                        }[];
                        catUserAffections: {
                          id: `cua${string}`;
                          updatedAt: string;
                          userId: `usr${string}`;
                          catId: `cat${string}`;
                          affection: number;
                        }[];
                        name?: string | null | undefined;
                      };
                      userItem: {
                        item: {
                          type: "TOY" | "FOOD" | "FURNITURE";
                          description: string | null;
                          name: string;
                          id: `itm${string}`;
                          createdAt: string;
                          updatedAt: string;
                          imageUrl: string;
                          price: number;
                          effect: number;
                        };
                        id: `uitm${string}`;
                        createdAt: string;
                        updatedAt: string;
                        userId: `usr${string}`;
                        itemId: `itm${string}`;
                        quantity: number;
                      } | null;
                      id: `int${string}`;
                      createdAt: string;
                      updatedAt: string;
                      userId: `usr${string}`;
                      catId: `cat${string}`;
                      userItemId: `uitm${string}` | null;
                      cost: number;
                      input: string | null;
                      processedInput: string | null;
                      output: string | null;
                      outputEmotion:
                        | (
                            | "annoyed"
                            | "curious"
                            | "happy"
                            | "sad"
                            | "angry"
                            | "scared"
                            | "excited"
                            | "sleepy"
                            | "smug"
                            | "sassy"
                            | "grumpy"
                            | "derpy"
                            | "judgy"
                            | "mischievous"
                            | "hungry"
                            | "energetic"
                            | "lazy"
                            | "comfy"
                            | "zoomies"
                            | "affectionate"
                            | "aloof"
                            | "attention_seeking"
                            | "suspicious"
                            | "playful"
                            | "content"
                            | "confused"
                          )[]
                        | null;
                    }[];
                    totalPages: number;
                    currentPage: number;
                  };
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              transactions: {
                $get: {
                  input: {};
                  output: {
                    type: "EARNED" | "SPENT";
                    description: string;
                    id: string;
                    createdAt: string;
                    userId: `usr${string}`;
                    amount: number;
                    category: "INTERACTION" | "SHOP" | "REWARD" | "DAILY_BONUS";
                    item?:
                      | {
                          type: "TOY" | "FOOD" | "FURNITURE";
                          description: string | null;
                          name: string;
                          id: `itm${string}`;
                          createdAt: string;
                          updatedAt: string;
                          imageUrl: string;
                          price: number;
                          effect: number;
                        }
                      | null
                      | undefined;
                    itemId?: `itm${string}` | null | undefined;
                    interactionId?: `int${string}` | null | undefined;
                  }[];
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              "user-items": {
                $get: {
                  input: {};
                  output: {
                    item: {
                      type: "TOY" | "FOOD" | "FURNITURE";
                      description: string | null;
                      name: string;
                      id: `itm${string}`;
                      createdAt: string;
                      updatedAt: string;
                      imageUrl: string;
                      price: number;
                      effect: number;
                    };
                    id: `uitm${string}`;
                    createdAt: string;
                    updatedAt: string;
                    userId: `usr${string}`;
                    itemId: `itm${string}`;
                    quantity: number;
                  }[];
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              "buy-item": {
                $post:
                  | {
                      input: {
                        json: {
                          itemId: `itm${string}`;
                          quantity?: number | undefined;
                        };
                      };
                      output: {};
                      outputFormat: string;
                      status: 400;
                    }
                  | {
                      input: {
                        json: {
                          itemId: `itm${string}`;
                          quantity?: number | undefined;
                        };
                      };
                      output: {};
                      outputFormat: string;
                      status: 404;
                    }
                  | {
                      input: {
                        json: {
                          itemId: `itm${string}`;
                          quantity?: number | undefined;
                        };
                      };
                      output: {
                        message: string;
                        success: boolean;
                      };
                      outputFormat: "json";
                      status: 200;
                    };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              items: {
                $get: {
                  input: {};
                  output: {
                    type: "TOY" | "FOOD" | "FURNITURE";
                    description: string | null;
                    name: string;
                    id: `itm${string}`;
                    createdAt: string;
                    updatedAt: string;
                    imageUrl: string;
                    price: number;
                    effect: number;
                  }[];
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              "list-all-cats": {
                $get: {
                  input: {};
                  output: {
                    description: string;
                    name: string;
                    id: `cat${string}`;
                    createdAt: string;
                    updatedAt: string;
                    hunger: number;
                    happiness: number;
                    energy: number;
                  }[];
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              "get-user-state": {
                $get:
                  | {
                      input: {
                        query: {
                          catId: `cat${string}`;
                        };
                      };
                      output: {};
                      outputFormat: string;
                      status: 404;
                    }
                  | {
                      input: {
                        query: {
                          catId: `cat${string}`;
                        };
                      };
                      output: {
                        description: string;
                        name: string;
                        id: `cat${string}`;
                        createdAt: string;
                        updatedAt: string;
                        hunger: number;
                        happiness: number;
                        energy: number;
                        memories: {
                          memory: string;
                          id: `mem${string}`;
                          createdAt: string;
                          userId: `usr${string}`;
                          catId: `cat${string}`;
                          interactionId?: `int${string}` | null | undefined;
                          thoughtId?: `thk${string}` | null | undefined;
                        }[];
                        interactions: {
                          type:
                            | "AUTONOMOUS_THOUGHT"
                            | "PET"
                            | "FEED"
                            | "PLAY"
                            | "CHAT";
                          status:
                            | "PENDING"
                            | "PROCESSING"
                            | "VALIDATION_FAILED"
                            | "COMPLETED"
                            | "FAILED";
                          id: `int${string}`;
                          createdAt: string;
                          updatedAt: string;
                          userId: `usr${string}`;
                          catId: `cat${string}`;
                          userItemId: `uitm${string}` | null;
                          cost: number;
                          input: string | null;
                          processedInput: string | null;
                          output: string | null;
                          outputEmotion:
                            | (
                                | "annoyed"
                                | "curious"
                                | "happy"
                                | "sad"
                                | "angry"
                                | "scared"
                                | "excited"
                                | "sleepy"
                                | "smug"
                                | "sassy"
                                | "grumpy"
                                | "derpy"
                                | "judgy"
                                | "mischievous"
                                | "hungry"
                                | "energetic"
                                | "lazy"
                                | "comfy"
                                | "zoomies"
                                | "affectionate"
                                | "aloof"
                                | "attention_seeking"
                                | "suspicious"
                                | "playful"
                                | "content"
                                | "confused"
                              )[]
                            | null;
                        }[];
                        thoughts: {
                          type: string;
                          content: string;
                          id: `thk${string}`;
                          createdAt: string;
                          catId: `cat${string}`;
                          emotion:
                            | (
                                | "annoyed"
                                | "curious"
                                | "happy"
                                | "sad"
                                | "angry"
                                | "scared"
                                | "excited"
                                | "sleepy"
                                | "smug"
                                | "sassy"
                                | "grumpy"
                                | "derpy"
                                | "judgy"
                                | "mischievous"
                                | "hungry"
                                | "energetic"
                                | "lazy"
                                | "comfy"
                                | "zoomies"
                                | "affectionate"
                                | "aloof"
                                | "attention_seeking"
                                | "suspicious"
                                | "playful"
                                | "content"
                                | "confused"
                              )[]
                            | null;
                        }[];
                        userAffections: {
                          id: `cua${string}`;
                          updatedAt: string;
                          userId: `usr${string}`;
                          catId: `cat${string}`;
                          affection: number;
                        }[];
                        activities: {
                          description: string;
                          id: `catActivity${string}`;
                          catId: `cat${string}`;
                          activity:
                            | "sleeping"
                            | "eating"
                            | "grooming"
                            | "playing"
                            | "loafing"
                            | "knocking_things"
                            | "box_sitting"
                            | "scratching"
                            | "hunting"
                            | "zooming"
                            | "keyboard_walking"
                            | "screen_blocking"
                            | "judging_humans"
                            | "making_content"
                            | "photoshoot";
                          location:
                            | "keyboard"
                            | "laptop"
                            | "box"
                            | "windowsill"
                            | "bed"
                            | "couch"
                            | "high_shelf"
                            | "paper_bag"
                            | "sunny_spot"
                            | "gaming_chair"
                            | "kitchen";
                          startTime: string;
                          endTime: string | null;
                        }[];
                      };
                      outputFormat: "json";
                      status: 200;
                    };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              interact: {
                $post: {
                  input: {
                    json: {
                      interaction: {
                        type: "PET" | "FEED" | "PLAY" | "CHAT";
                        userItemId?: `uitm${string}` | undefined;
                        input?: string | undefined;
                      };
                      catId: `cat${string}`;
                    };
                  };
                  output: {
                    interactionId: `int${string}`;
                  };
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          > &
          import("hono/types").MergeSchemaPath<
            {
              "get-state": {
                $get: {
                  input: {
                    query: {
                      catId: `cat${string}`;
                    };
                  };
                  output: {
                    description: string;
                    name: string;
                    id: `cat${string}`;
                    createdAt: string;
                    updatedAt: string;
                    hunger: number;
                    happiness: number;
                    energy: number;
                    memories: {
                      memory: string;
                      id: `mem${string}`;
                      createdAt: string;
                      userId: `usr${string}`;
                      catId: `cat${string}`;
                      interactionId?: `int${string}` | null | undefined;
                      thoughtId?: `thk${string}` | null | undefined;
                    }[];
                    interactions: {
                      type:
                        | "AUTONOMOUS_THOUGHT"
                        | "PET"
                        | "FEED"
                        | "PLAY"
                        | "CHAT";
                      status:
                        | "PENDING"
                        | "PROCESSING"
                        | "VALIDATION_FAILED"
                        | "COMPLETED"
                        | "FAILED";
                      id: `int${string}`;
                      createdAt: string;
                      updatedAt: string;
                      userId: `usr${string}`;
                      catId: `cat${string}`;
                      userItemId: `uitm${string}` | null;
                      cost: number;
                      input: string | null;
                      processedInput: string | null;
                      output: string | null;
                      outputEmotion:
                        | (
                            | "annoyed"
                            | "curious"
                            | "happy"
                            | "sad"
                            | "angry"
                            | "scared"
                            | "excited"
                            | "sleepy"
                            | "smug"
                            | "sassy"
                            | "grumpy"
                            | "derpy"
                            | "judgy"
                            | "mischievous"
                            | "hungry"
                            | "energetic"
                            | "lazy"
                            | "comfy"
                            | "zoomies"
                            | "affectionate"
                            | "aloof"
                            | "attention_seeking"
                            | "suspicious"
                            | "playful"
                            | "content"
                            | "confused"
                          )[]
                        | null;
                    }[];
                    thoughts: {
                      type: string;
                      content: string;
                      id: `thk${string}`;
                      createdAt: string;
                      catId: `cat${string}`;
                      emotion:
                        | (
                            | "annoyed"
                            | "curious"
                            | "happy"
                            | "sad"
                            | "angry"
                            | "scared"
                            | "excited"
                            | "sleepy"
                            | "smug"
                            | "sassy"
                            | "grumpy"
                            | "derpy"
                            | "judgy"
                            | "mischievous"
                            | "hungry"
                            | "energetic"
                            | "lazy"
                            | "comfy"
                            | "zoomies"
                            | "affectionate"
                            | "aloof"
                            | "attention_seeking"
                            | "suspicious"
                            | "playful"
                            | "content"
                            | "confused"
                          )[]
                        | null;
                    }[];
                    userAffections: {
                      id: `cua${string}`;
                      updatedAt: string;
                      userId: `usr${string}`;
                      catId: `cat${string}`;
                      affection: number;
                    }[];
                    activities: {
                      description: string;
                      id: `catActivity${string}`;
                      catId: `cat${string}`;
                      activity:
                        | "sleeping"
                        | "eating"
                        | "grooming"
                        | "playing"
                        | "loafing"
                        | "knocking_things"
                        | "box_sitting"
                        | "scratching"
                        | "hunting"
                        | "zooming"
                        | "keyboard_walking"
                        | "screen_blocking"
                        | "judging_humans"
                        | "making_content"
                        | "photoshoot";
                      location:
                        | "keyboard"
                        | "laptop"
                        | "box"
                        | "windowsill"
                        | "bed"
                        | "couch"
                        | "high_shelf"
                        | "paper_bag"
                        | "sunny_spot"
                        | "gaming_chair"
                        | "kitchen";
                      startTime: string;
                      endTime: string | null;
                    }[];
                  };
                  outputFormat: "json";
                  status: 200;
                };
              };
            },
            "/"
          >,
        "/cat-agent"
      >,
    "/"
  >
>;
export type CatAPI = Awaited<ReturnType<typeof createCatApi>>;
