# Architecture

```text
React + TypeScript
       |
       | JSON
       v
Node.js + Express
       |
       | OAuth2 Client Credentials
       v
Microsoft Entra ID
       |
       v
Power BI REST API
       |
       | executeQueries
       v
Semantic Model
```

## Boundary

The browser knows dashboard component IDs and selected filter values. It does not receive the Client Secret and it does not send arbitrary DAX.

The backend reads semantic references from `config/dashboard.json`, builds known query shapes, authenticates, executes the DAX and normalizes the response.
