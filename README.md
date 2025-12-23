# Baynunah Insurance Renewal Portal 2026

A secure web portal for Baynunah employees to verify and update their medical insurance information for 2026.

## Features

- **Secure Authentication**: Login with Employee ID and Date of Birth
- **Data Verification**: View and update insurance records for employees and dependents
- **Input Validation**: Client and server-side validation for Emirates ID, Passport, and Visa numbers
- **Responsive Design**: Mobile-friendly interface
- **Accessibility**: ARIA labels and keyboard navigation support

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: Azure Functions (Node.js)
- **Data Storage**: Microsoft SharePoint List via Microsoft Graph API
- **Hosting**: Azure Static Web Apps

## Security Features

- Input sanitization to prevent XSS attacks
- Employee ID format validation to prevent injection attacks
- Session tokens with HMAC-SHA256 signature and 1-hour expiry
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- HTTPS-only deployment

## Deployment

### Prerequisites

1. Azure subscription
2. Microsoft Entra ID (Azure AD) app registration with Graph API permissions
3. SharePoint site with the insurance data list

### Environment Variables

Configure these in Azure Static Web Apps application settings:

| Variable | Description |
|----------|-------------|
| `TENANT_ID` | Azure AD tenant ID |
| `CLIENT_ID` | Azure AD app client ID |
| `CLIENT_SECRET` | Azure AD app client secret |
| `SITE_HOSTNAME` | SharePoint site hostname |
| `SITE_PATH` | SharePoint site path |
| `LIST_TITLE` | SharePoint list title |
| `TOKEN_SECRET` | Secret for signing session tokens |

### GitHub Actions Deployment

1. Create an Azure Static Web App in the Azure portal
2. Copy the deployment token from Azure
3. Add it as a GitHub secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`
4. Push to the `main` branch to trigger deployment

## Local Development

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Install API dependencies
cd baynunah-insurance-portal/api
npm install

# Run locally
cd ..
swa start . --api-location ./api
```

## Project Structure

```
baynunah-insurance-portal/
├── index.html              # Main application page
├── app.js                  # Frontend JavaScript
├── staticwebapp.config.json # Azure SWA configuration
└── api/
    ├── package.json        # API dependencies
    ├── shared/
    │   └── graph.js        # Microsoft Graph API utilities
    ├── login/
    │   ├── function.json   # Azure Function binding
    │   └── index.js        # Login endpoint
    └── update/
        ├── function.json   # Azure Function binding
        └── index.js        # Update endpoint
```

## License

Internal use only - Baynunah HR & Information Systems 2025
