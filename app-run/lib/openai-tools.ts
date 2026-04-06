export const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_expenses",
      description:
        "Create one or more expense records. Use categoryHint with a short label (e.g. groceries, food, transport, bills, coffee). Resolve merchant and description when present.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number", description: "Positive amount in account currency" },
                categoryHint: { type: "string" },
                dateHint: {
                  type: "string",
                  description: "today, yesterday, or ISO date YYYY-MM-DD",
                },
                merchant: { type: "string" },
                description: { type: "string" },
                paymentMethod: { type: "string" },
              },
              required: ["amount", "categoryHint"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_expenses",
      description: "List expenses with optional filters and sorting.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "ISO date start" },
          to: { type: "string", description: "ISO date end" },
          categorySlug: { type: "string", description: "Category slug e.g. food, groceries" },
          q: { type: "string", description: "Search in description or merchant" },
          sort: { type: "string", enum: ["date-desc", "date-asc", "amount-desc", "amount-asc"] },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_spending_summary",
      description:
        "Totals and per-category breakdown. Use categoryGroup food for all food-related (groceries, restaurants, coffee, food).",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_month", "last_month", "last_7_days", "last_30_days", "this_week"],
          },
          categorySlug: { type: "string", description: "Single category slug" },
          categoryGroup: {
            type: "string",
            enum: ["food", "transport", "bills", "entertainment", "shopping", "healthcare"],
            description: "Aggregate multiple categories, e.g. food = groceries + restaurants + coffee + food",
          },
          categorySlugs: {
            type: "array",
            items: { type: "string" },
            description: "Explicit list of category slugs to sum",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_months",
      description: "Compare this calendar month spending vs previous month with category deltas.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_expense",
      description:
        "Update an expense. useLastCreated targets last added in chat. For 'yesterday's grocery expense' use lookupDateHint (yesterday) + lookupCategoryHint (groceries).",
      parameters: {
        type: "object",
        properties: {
          expenseId: { type: "string" },
          useLastCreated: { type: "boolean" },
          lookupDateHint: {
            type: "string",
            description: "Find expense on this day: yesterday, today, or YYYY-MM-DD",
          },
          lookupCategoryHint: { type: "string", description: "Category to match with lookupDateHint" },
          lookupMerchantHint: { type: "string", description: "Optional merchant substring to disambiguate" },
          amount: { type: "number" },
          categoryHint: { type: "string", description: "New category" },
          dateHint: { type: "string", description: "New date" },
          merchant: { type: "string" },
          description: { type: "string" },
          paymentMethod: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_expense",
      description: "Delete a single expense by id or last created.",
      parameters: {
        type: "object",
        properties: {
          expenseId: { type: "string" },
          useLastCreated: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_expenses_batch",
      description:
        "Delete multiple expenses. Use period this_week + categorySlug coffee for 'coffee expenses this week'. Set confirmed true after user confirms.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_week", "last_7_days"],
            description: "Shortcut date range; overrides from/to when set",
          },
          from: { type: "string" },
          to: { type: "string" },
          categorySlug: { type: "string" },
          q: { type: "string", description: "Substring in merchant or description" },
          confirmed: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_budget_status",
      description: "Compare budgets to actual spending for a month.",
      parameters: {
        type: "object",
        properties: {
          year: { type: "integer" },
          month: { type: "integer", minimum: 1, maximum: 12 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_expenses",
      description: "Largest expenses in a period (e.g. last week).",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["this_month", "last_month", "last_7_days", "last_30_days", "this_week"],
          },
          limit: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spending_insights",
      description: "Aggregated insights: MoM change, top categories and merchants for narration.",
      parameters: { type: "object", properties: {} },
    },
  },
];
