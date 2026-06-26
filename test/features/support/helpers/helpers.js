// =========================================
// Environment
// =========================================

export const localhost = process.env.API_URL || "http://localhost:3003";

export const defaultExpectedResponseTime = 15000;

// =========================================
// Headers
// =========================================

export const acceptHeader = {
  key: "Content-Type",
  value: "application/json"
};

// =========================================
// ESS Endpoints
// =========================================

export const asyncsearchEndpoint = "/registry/search";

export const syncSearchEndpoint = "/registry/sync/search";

export const onSearchEndpoint = "/registry/on-search";

export const checkEnrollmentEndpoint =
  "/registry/sync/check-enrollment";

export const txnStatusEndpoint =
  "/registry/txn/status";

export const syncStatusEndpoint =
  "/registry/sync/status";

export const subscribeEndpoint =
  "/registry/subscribe";

export const unsubscribeEndpoint =
  "/registry/unsubscribe";

export const notifyEndpoint =
  "/registry/notify";

export const onSubscribeEndpoint =
  "/registry/on-subscribe";

export const onUnsubscribeEndpoint =
  "/registry/on-unsubscribe";

export const onStatusEndpoint =
  "/registry/on-status";


// =========================================
// Common Test Data
// =========================================

export const transactionId = "XZFHYTY";
export const correlationId = "ABC9876543210";
export const referenceId = "SDFRTYUX";
export const personIdentifier = "ABC451123";
export const memberIdentifier = "42343545654";


// =========================================
// Requests
// =========================================

export const asyncSearchRequest = {};

export const syncSearchRequest = {};

export const onSearchRequest = {};

export const checkEnrollmentRequest = {};

export const txnStatusRequest = {};

export const syncStatusRequest = {};

export const subscribeRequest = {};

export const unsubscribeRequest = {};

export const notifyRequest = {};

export const onSubscribeRequest = {};

export const onUnsubscribeRequest = {};

export const onStatusRequest = {};


// =========================================
// Generic ACK Schema
// =========================================

export const ackResponseSchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: {
      type: "object",
      required: [
        "ack_status",
        "timestamp",
        "correlation_id"
      ],
      properties: {
        ack_status: {
          type: "string",
          enum: ["ACK", "NACK"]
        },
        timestamp: {
          type: "string"
        },
        correlation_id: {
          type: "string"
        },
        error: {
          type: "object"
        }
      }
    }
  }
};


// =========================================
// Async Search ACK Schema
// =========================================

export const asyncsearchResponseSchema =
  ackResponseSchema;


// =========================================
// On Search ACK Schema
// =========================================

export const onSearchResponseSchema =
  ackResponseSchema;


// =========================================
// Subscribe ACK Schema
// =========================================

export const subscribeResponseSchema =
  ackResponseSchema;


// =========================================
// Unsubscribe ACK Schema
// =========================================

export const unsubscribeResponseSchema =
  ackResponseSchema;


// =========================================
// Notify ACK Schema
// =========================================

export const notifyResponseSchema =
  ackResponseSchema;


// =========================================
// Sync Search Schema
// =========================================

export const syncSearchSchema = {

  type: "object",

  required: [
    "header",
    "message"
  ],

  properties: {

    header: {

      type: "object",

      required: [
        "version",
        "message_id",
        "action",
        "sender_id",
        "receiver_id"
      ]

    },

    message: {

      type: "object",

      required: [
        "transaction_id",
        "correlation_id",
        "search_response"
      ],

      properties: {

        transaction_id: {
          type: "string"
        },

        correlation_id: {
          type: "string"
        },

        search_response: {

          type: "array",

          items: {

            type: "object",

            required: [
              "reference_id",
              "status",
              "data"
            ],

            properties: {

              reference_id: {
                type: "string"
              },

              status: {
                type: "string"
              },

              data: {
                type: "object"
              }

            }

          }

        }

      }

    }

  }

};


// =========================================
// Enrollment Schema
// =========================================

export const enrollmentResponseSchema = {

  type: "object",

  required: [
    "header",
    "message"
  ],

  properties: {

    header: {
      type: "object"
    },

    message: {

      type: "object",

      required: [
        "transaction_id",
        "correlation_id",
        "enrolled_response"
      ],

      properties: {

        transaction_id: {
          type: "string"
        },

        correlation_id: {
          type: "string"
        },

        enrolled_response: {

          type: "array",

          items: {

            type: "object",

            required: [
              "reference_id",
              "enrolled_status"
            ],

            properties: {

              reference_id: {
                type: "string"
              },

              enrolled_status: {
                type: "string"
              }

            }

          }

        }

      }

    }

  }

};


// =========================================
// Transaction Status Schema
// =========================================

export const txnStatusSchema = {

  type: "object",

  required: ["message"],

  properties: {

    message: {

      type: "object",

      required: [
        "transaction_id",
        "txn_status"
      ],

      properties: {

        transaction_id: {
          type: "string"
        },

        txn_status: {

          type: "string",

          enum: [
            "pending",
            "processing",
            "completed",
            "failed"
          ]

        }

      }

    }

  }

};


// =========================================
// Sync Status Schema
// =========================================

export const syncStatusSchema =
  txnStatusSchema;


// =========================================
// Callback Schemas
// =========================================

export const onSubscribeResponseSchema =
  ackResponseSchema;

export const onUnsubscribeResponseSchema =
  ackResponseSchema;

export const onStatusResponseSchema =
  ackResponseSchema;