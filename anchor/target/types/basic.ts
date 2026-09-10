/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/basic.json`.
 */
export type Basic = {
  "address": "CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ",
  "metadata": {
    "name": "basic",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimRefund",
      "discriminator": [
        15,
        16,
        30,
        161,
        255,
        228,
        97,
        60
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true,
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "auction",
          "writable": true,
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "bidderTokens",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "closeAndUndelegate",
      "docs": [
        "Final ER step: commit the shared result and winning escrow together.",
        "Losing bid escrows return independently when their owners claim refunds."
      ],
      "discriminator": [
        32,
        206,
        119,
        59,
        157,
        83,
        73,
        120
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "liveAuction",
          "writable": true
        },
        {
          "name": "winnerBid",
          "writable": true,
          "optional": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createAuction",
      "discriminator": [
        234,
        6,
        201,
        246,
        47,
        219,
        176,
        107
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "auctionId"
              }
            ]
          }
        },
        {
          "name": "liveAuction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  118,
                  101,
                  95,
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "auctionId",
          "type": "u64"
        },
        {
          "name": "titleHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "reservePrice",
          "type": "u64"
        },
        {
          "name": "minIncrement",
          "type": "u64"
        },
        {
          "name": "endsAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "createCampaign",
      "discriminator": [
        111,
        131,
        187,
        98,
        160,
        193,
        114,
        244
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "paymentMint"
        },
        {
          "name": "campaign",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "campaignId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "campaignId",
          "type": "u64"
        },
        {
          "name": "titleHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "detailsHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "moderator",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "delegateBidEscrow",
      "discriminator": [
        89,
        35,
        17,
        5,
        209,
        112,
        79,
        61
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bidder",
          "signer": true
        },
        {
          "name": "auction"
        },
        {
          "name": "bufferBidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "bidEscrow"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                174,
                137,
                142,
                135,
                230,
                199,
                255,
                236,
                50,
                187,
                227,
                135,
                201,
                174,
                56,
                49,
                39,
                3,
                197,
                172,
                14,
                167,
                123,
                222,
                26,
                193,
                2,
                25,
                71,
                4,
                44,
                230
              ]
            }
          }
        },
        {
          "name": "delegationRecordBidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bidEscrow"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataBidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "bidEscrow"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "ownerProgram",
          "address": "CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegateLiveAuction",
      "discriminator": [
        147,
        117,
        197,
        119,
        231,
        172,
        76,
        149
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction"
        },
        {
          "name": "bufferLiveAuction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "liveAuction"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                174,
                137,
                142,
                135,
                230,
                199,
                255,
                236,
                50,
                187,
                227,
                135,
                201,
                174,
                56,
                49,
                39,
                3,
                197,
                172,
                14,
                167,
                123,
                222,
                26,
                193,
                2,
                25,
                71,
                4,
                44,
                230
              ]
            }
          }
        },
        {
          "name": "delegationRecordLiveAuction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "liveAuction"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataLiveAuction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "liveAuction"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "liveAuction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  118,
                  101,
                  95,
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          },
          "relations": [
            "auction"
          ]
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "ownerProgram",
          "address": "CkKbXccct8gWcfUyZzv2UGbDLtGSoMcsM6ZrWQ5dPnvZ"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "finalizeAuction",
      "docs": [
        "Runs on Solana after the ER result is committed. Locks the winner and",
        "returns only their unused maximum budget. The winning amount remains in",
        "the vault until approved artwork and accepted fulfillment proof exist."
      ],
      "discriminator": [
        220,
        209,
        175,
        193,
        57,
        132,
        241,
        168
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "relations": [
            "winnerBid"
          ]
        },
        {
          "name": "liveAuction",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "winnerBid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "live_auction.highest_bidder",
                "account": "liveAuction"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "winnerTokens",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "finalizeNoBidAuction",
      "discriminator": [
        122,
        46,
        66,
        98,
        86,
        43,
        53,
        126
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "liveAuction",
          "relations": [
            "auction"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "openBidEscrow",
      "docs": [
        "Locks a bidder's maximum spend on Solana before any ER bid is accepted."
      ],
      "discriminator": [
        170,
        94,
        223,
        211,
        80,
        190,
        88,
        119
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidderTokens",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBid",
      "docs": [
        "Runs on the hosted ER; the locked token balance remains on Solana."
      ],
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "liveAuction",
          "writable": true
        },
        {
          "name": "auction",
          "relations": [
            "liveAuction",
            "bidEscrow"
          ]
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidder",
          "docs": [
            "public bidder identity. The actual signer may be this wallet or its",
            "valid, target-program-bound session key."
          ],
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sessionToken",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "publishCampaign",
      "discriminator": [
        6,
        162,
        187,
        58,
        49,
        85,
        170,
        248
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true,
          "relations": [
            "campaign"
          ]
        },
        {
          "name": "campaign",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "registerCampaignLot",
      "discriminator": [
        130,
        83,
        237,
        229,
        194,
        53,
        193,
        125
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "campaign",
            "auction"
          ]
        },
        {
          "name": "campaign",
          "writable": true
        },
        {
          "name": "paymentMint",
          "relations": [
            "campaign",
            "auction"
          ]
        },
        {
          "name": "auction"
        },
        {
          "name": "campaignLot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  109,
                  112,
                  97,
                  105,
                  103,
                  110,
                  95,
                  108,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "campaign"
              },
              {
                "kind": "arg",
                "path": "lotIndex"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lotIndex",
          "type": "u16"
        },
        {
          "name": "placementHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "creativeRequired",
          "type": "bool"
        }
      ]
    },
    {
      "name": "releasePayment",
      "docs": [
        "Releases the winning amount only after the winner's artwork has been",
        "approved and the winner has accepted the creator's fulfillment proof."
      ],
      "discriminator": [
        24,
        34,
        191,
        86,
        145,
        160,
        183,
        233
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction",
          "writable": true,
          "relations": [
            "campaignLot",
            "creative",
            "proof"
          ]
        },
        {
          "name": "creator",
          "relations": [
            "auction",
            "proof"
          ]
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "campaignLot"
        },
        {
          "name": "campaign",
          "relations": [
            "campaignLot"
          ]
        },
        {
          "name": "creative"
        },
        {
          "name": "proof"
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "creatorTokens",
          "writable": true
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "reviewCreative",
      "discriminator": [
        222,
        215,
        252,
        59,
        64,
        101,
        119,
        12
      ],
      "accounts": [
        {
          "name": "moderator",
          "signer": true,
          "relations": [
            "campaign"
          ]
        },
        {
          "name": "campaign",
          "relations": [
            "campaignLot"
          ]
        },
        {
          "name": "campaignLot"
        },
        {
          "name": "auction",
          "relations": [
            "campaignLot",
            "creative"
          ]
        },
        {
          "name": "creative",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "approved",
          "type": "bool"
        },
        {
          "name": "reasonHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "reviewFulfillmentProof",
      "discriminator": [
        204,
        95,
        70,
        184,
        207,
        179,
        231,
        38
      ],
      "accounts": [
        {
          "name": "winner",
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "campaign",
          "writable": true,
          "relations": [
            "campaignLot"
          ]
        },
        {
          "name": "campaignLot"
        },
        {
          "name": "auction",
          "relations": [
            "campaignLot",
            "proof"
          ]
        },
        {
          "name": "proof",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "accepted",
          "type": "bool"
        }
      ]
    },
    {
      "name": "submitCreative",
      "discriminator": [
        175,
        96,
        17,
        74,
        66,
        31,
        191,
        13
      ],
      "accounts": [
        {
          "name": "submitter",
          "writable": true,
          "signer": true
        },
        {
          "name": "auction"
        },
        {
          "name": "creative",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  97,
                  116,
                  105,
                  118,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "submitter"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "submitFulfillmentProof",
      "discriminator": [
        58,
        115,
        194,
        99,
        105,
        30,
        127,
        3
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "auction"
        },
        {
          "name": "proof",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  111,
                  102
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "topUpBidEscrow",
      "discriminator": [
        130,
        255,
        121,
        136,
        71,
        170,
        66,
        228
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true,
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "auction",
          "writable": true,
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "paymentMint",
          "relations": [
            "auction"
          ]
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidderTokens",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "undelegateBidEscrow",
      "discriminator": [
        46,
        15,
        186,
        127,
        58,
        218,
        165,
        160
      ],
      "accounts": [
        {
          "name": "bidder",
          "writable": true,
          "signer": true,
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "auction",
          "relations": [
            "bidEscrow"
          ]
        },
        {
          "name": "bidEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "auction"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    },
    {
      "name": "bidEscrow",
      "discriminator": [
        146,
        219,
        14,
        4,
        42,
        183,
        243,
        215
      ]
    },
    {
      "name": "campaign",
      "discriminator": [
        50,
        40,
        49,
        11,
        157,
        220,
        229,
        192
      ]
    },
    {
      "name": "campaignLot",
      "discriminator": [
        117,
        224,
        122,
        18,
        190,
        128,
        184,
        46
      ]
    },
    {
      "name": "creativeSubmission",
      "discriminator": [
        17,
        139,
        189,
        20,
        219,
        88,
        192,
        250
      ]
    },
    {
      "name": "fulfillmentProof",
      "discriminator": [
        243,
        27,
        73,
        146,
        238,
        232,
        98,
        252
      ]
    },
    {
      "name": "liveAuction",
      "discriminator": [
        97,
        57,
        64,
        102,
        159,
        193,
        170,
        132
      ]
    },
    {
      "name": "settlementReceipt",
      "discriminator": [
        52,
        249,
        252,
        121,
        4,
        232,
        187,
        4
      ]
    }
  ],
  "events": [
    {
      "name": "auctionClosedNoBid",
      "discriminator": [
        130,
        28,
        179,
        85,
        184,
        150,
        100,
        219
      ]
    },
    {
      "name": "auctionCreated",
      "discriminator": [
        133,
        190,
        194,
        65,
        172,
        0,
        70,
        178
      ]
    },
    {
      "name": "auctionSettled",
      "discriminator": [
        61,
        151,
        131,
        170,
        95,
        203,
        219,
        147
      ]
    },
    {
      "name": "bidEscrowOpened",
      "discriminator": [
        95,
        126,
        31,
        181,
        24,
        187,
        57,
        94
      ]
    },
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    },
    {
      "name": "campaignCreated",
      "discriminator": [
        9,
        98,
        69,
        61,
        53,
        131,
        64,
        152
      ]
    },
    {
      "name": "campaignLotRegistered",
      "discriminator": [
        154,
        10,
        207,
        209,
        62,
        133,
        128,
        52
      ]
    },
    {
      "name": "campaignPublished",
      "discriminator": [
        112,
        159,
        103,
        196,
        17,
        99,
        114,
        5
      ]
    },
    {
      "name": "creativeReviewed",
      "discriminator": [
        185,
        134,
        125,
        81,
        0,
        232,
        108,
        51
      ]
    },
    {
      "name": "creativeSubmitted",
      "discriminator": [
        10,
        95,
        145,
        189,
        138,
        113,
        242,
        232
      ]
    },
    {
      "name": "fulfillmentReviewed",
      "discriminator": [
        107,
        126,
        66,
        61,
        232,
        36,
        249,
        75
      ]
    },
    {
      "name": "fulfillmentSubmitted",
      "discriminator": [
        53,
        32,
        227,
        150,
        194,
        244,
        189,
        2
      ]
    },
    {
      "name": "refundClaimed",
      "discriminator": [
        136,
        64,
        242,
        99,
        4,
        244,
        208,
        130
      ]
    },
    {
      "name": "winnerFinalized",
      "discriminator": [
        82,
        72,
        98,
        210,
        160,
        50,
        191,
        128
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidEndTime",
      "msg": "The auction end time must be in the future"
    },
    {
      "code": 6001,
      "name": "invalidReserve",
      "msg": "The reserve price must be greater than zero"
    },
    {
      "code": 6002,
      "name": "invalidIncrement",
      "msg": "The minimum increment must be greater than zero"
    },
    {
      "code": 6003,
      "name": "invalidDeposit",
      "msg": "The escrow deposit must be greater than zero"
    },
    {
      "code": 6004,
      "name": "auctionNotLive",
      "msg": "The auction is not live"
    },
    {
      "code": 6005,
      "name": "auctionEnded",
      "msg": "The auction has ended"
    },
    {
      "code": 6006,
      "name": "auctionStillLive",
      "msg": "The auction is still live"
    },
    {
      "code": 6007,
      "name": "auctionAlreadyClosed",
      "msg": "The auction is already closed"
    },
    {
      "code": 6008,
      "name": "auctionNotClosed",
      "msg": "The auction has not been closed on the ER"
    },
    {
      "code": 6009,
      "name": "auctionNotSettled",
      "msg": "The auction is not settled"
    },
    {
      "code": 6010,
      "name": "bidTooLow",
      "msg": "The bid does not meet the current minimum"
    },
    {
      "code": 6011,
      "name": "insufficientEscrow",
      "msg": "The bid is larger than the bidder's locked balance"
    },
    {
      "code": 6012,
      "name": "noBids",
      "msg": "No valid bids were placed"
    },
    {
      "code": 6013,
      "name": "invalidWinner",
      "msg": "The supplied winner account does not match the auction result"
    },
    {
      "code": 6014,
      "name": "alreadyClaimed",
      "msg": "This balance has already been claimed"
    },
    {
      "code": 6015,
      "name": "winnerAlreadyPaid",
      "msg": "The winner was already paid during settlement"
    },
    {
      "code": 6016,
      "name": "wrongMint",
      "msg": "The token mint does not match the auction"
    },
    {
      "code": 6017,
      "name": "unauthorized",
      "msg": "The signer is not authorized"
    },
    {
      "code": 6018,
      "name": "invalidContentHash",
      "msg": "The supplied content hash is invalid"
    },
    {
      "code": 6019,
      "name": "campaignAlreadyPublished",
      "msg": "The campaign has already been published"
    },
    {
      "code": 6020,
      "name": "campaignHasNoLots",
      "msg": "The campaign must contain at least one lot"
    },
    {
      "code": 6021,
      "name": "invalidLotIndex",
      "msg": "Campaign lots must be registered in order"
    },
    {
      "code": 6022,
      "name": "alreadyReviewed",
      "msg": "This submission has already been reviewed"
    },
    {
      "code": 6023,
      "name": "artworkNotApproved",
      "msg": "The winning artwork has not been approved"
    },
    {
      "code": 6024,
      "name": "fulfillmentNotAccepted",
      "msg": "The fulfillment proof has not been accepted by the winner"
    },
    {
      "code": 6025,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "liveAuction",
            "type": "pubkey"
          },
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "titleHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "auctionStatus"
              }
            }
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "winningBid",
            "type": "u64"
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalRefunded",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "settledAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionClosedNoBid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "settledAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "liveAuction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "auctionId",
            "type": "u64"
          },
          {
            "name": "reservePrice",
            "type": "u64"
          },
          {
            "name": "endsAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "auctionSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "receipt",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "auctionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "live"
          },
          {
            "name": "settled"
          }
        ]
      }
    },
    {
      "name": "bidEscrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "deposited",
            "type": "u64"
          },
          {
            "name": "currentBid",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidEscrowOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "maxAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "previousBidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bidCount",
            "type": "u64"
          },
          {
            "name": "endsAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "campaign",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "moderator",
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "campaignId",
            "type": "u64"
          },
          {
            "name": "titleHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "detailsHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "campaignStatus"
              }
            }
          },
          {
            "name": "lotCount",
            "type": "u16"
          },
          {
            "name": "acceptedProofs",
            "type": "u16"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "publishedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "campaignCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "moderator",
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "campaignId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "campaignLot",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "lotIndex",
            "type": "u16"
          },
          {
            "name": "placementHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creativeRequired",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "campaignLotRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "lotIndex",
            "type": "u16"
          },
          {
            "name": "placementHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "creativeRequired",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "campaignPublished",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "campaign",
            "type": "pubkey"
          },
          {
            "name": "lotCount",
            "type": "u16"
          },
          {
            "name": "publishedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "campaignStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "draft"
          },
          {
            "name": "live"
          }
        ]
      }
    },
    {
      "name": "creativeReviewed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creative",
            "type": "pubkey"
          },
          {
            "name": "reviewer",
            "type": "pubkey"
          },
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "reasonHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "reviewedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "creativeSubmission",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "submitter",
            "type": "pubkey"
          },
          {
            "name": "contentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "reviewStatus"
              }
            }
          },
          {
            "name": "reviewer",
            "type": "pubkey"
          },
          {
            "name": "reasonHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "reviewedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "creativeSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creative",
            "type": "pubkey"
          },
          {
            "name": "submitter",
            "type": "pubkey"
          },
          {
            "name": "contentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "submittedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "fulfillmentProof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "contentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proofStatus"
              }
            }
          },
          {
            "name": "reviewer",
            "type": "pubkey"
          },
          {
            "name": "submittedAt",
            "type": "i64"
          },
          {
            "name": "reviewedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "fulfillmentReviewed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "proof",
            "type": "pubkey"
          },
          {
            "name": "reviewer",
            "type": "pubkey"
          },
          {
            "name": "accepted",
            "type": "bool"
          },
          {
            "name": "reviewedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "fulfillmentSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "proof",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "contentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "submittedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "liveAuction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "reservePrice",
            "type": "u64"
          },
          {
            "name": "minIncrement",
            "type": "u64"
          },
          {
            "name": "endsAt",
            "type": "i64"
          },
          {
            "name": "highestBid",
            "type": "u64"
          },
          {
            "name": "highestBidder",
            "type": "pubkey"
          },
          {
            "name": "bidCount",
            "type": "u64"
          },
          {
            "name": "closed",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proofStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "accepted"
          },
          {
            "name": "disputed"
          }
        ]
      }
    },
    {
      "name": "refundClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "reviewStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "approved"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "sessionTokenV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "feePayer",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "settlementReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "titleHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "settledAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "winnerFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "auction",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
