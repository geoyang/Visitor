# Theme Management MongoDB Schema

## Database: visitor_management

The theme management system is integrated into the main `visitor_management` MongoDB database alongside other collections (visitors, forms, companies, locations, etc.).

**Implementation Status:** ✅ **COMPLETE**
- Theme models and API endpoints are fully implemented in `main.py`
- Collections: `themes` and `theme_activations` are configured
- All CRUD operations with proper authentication and company isolation
- **Built-in themes populated**: 4 themes × 18 companies = 72 theme records
- React Native app updated to load themes from database instead of hardcoded values

## MongoDB Collections

### themes Collection
Each theme is stored as a MongoDB document with the following structure:

```javascript
{
  _id: ObjectId("..."), // MongoDB auto-generated ID
  id: "theme_12345", // Custom string ID for client reference
  name: "Company Blue Theme",
  description: "Custom blue theme for company branding",
  category: "custom", // enum: 'default', 'seasonal', 'brand', 'event', 'custom'
  status: "active", // enum: 'active', 'inactive', 'draft'
  
  // Theme styling data
  colors: {
    primary: "#2563eb",
    secondary: "#3b82f6",
    background: "#ffffff",
    surface: "#f3f4f6",
    text: "#111827",
    textSecondary: "#6b7280",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#10b981",
    info: "#3b82f6",
    border: "#e5e7eb",
    headerBackground: "#2563eb",
    headerText: "#ffffff",
    buttonBackground: "#2563eb",
    buttonText: "#ffffff",
    linkColor: "#2563eb"
  },
  fonts: {
    primary: "System",
    heading: "System",
    body: "System",
    button: "System",
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      xxl: 24
    },
    weights: {
      light: "300",
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700"
    }
  },
  images: {
    logo: "",
    background: "",
    welcomeImage: ""
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  },
  shadows: {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  },
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    },
    easing: {
      linear: "linear",
      easeIn: "ease-in",
      easeOut: "ease-out",
      easeInOut: "ease-in-out"
    }
  },
  formConfig: {
    defaultFormIds: [],
    formOrder: [],
    hiddenFormIds: [],
    formStyles: {}
  },
  layoutConfig: {
    showLogo: true,
    logoPosition: "center", // enum: 'left', 'center', 'right'
    showCompanyName: true,
    showWelcomeMessage: true,
    welcomeMessage: "Welcome!",
    showDateTime: true,
    showLocationInfo: true
  },
  
  // Company isolation
  companyId: "company_123",
  createdBy: "user_456",
  
  // Metadata
  createdAt: ISODate("2023-12-01T10:00:00Z"),
  updatedAt: ISODate("2023-12-01T15:30:00Z"),
  version: 1
}
```

### themeActivations Collection (Optional)
Tracks which theme is currently active for each company:

```javascript
{
  _id: ObjectId("..."),
  companyId: "company_123",
  themeId: "theme_12345", // Reference to themes collection
  themeType: "custom", // enum: 'builtin', 'custom'
  builtinThemeName: null, // For built-in themes like 'hightech'
  activatedAt: ISODate("2023-12-01T16:00:00Z"),
  activatedBy: "user_456"
}
```

## MongoDB Indexes

```javascript
// themes collection indexes
db.themes.createIndex({ "companyId": 1 }) // Company isolation
db.themes.createIndex({ "companyId": 1, "status": 1 }) // Active themes per company
db.themes.createIndex({ "companyId": 1, "category": 1 }) // Theme categories per company
db.themes.createIndex({ "id": 1 }, { unique: true }) // Unique theme ID
db.themes.createIndex({ "createdAt": -1 }) // Newest themes first

// themeActivations collection indexes  
db.themeActivations.createIndex({ "companyId": 1 }, { unique: true }) // One active theme per company
db.themeActivations.createIndex({ "themeId": 1 })
```

## API Endpoints Required

### 1. Get Company Themes
```
GET /api/themes?companyId={companyId}
```
**Headers:**
- `Content-Type: application/json`
- `X-Device-Token: {deviceToken}` (optional)

**Response:**
```json
[
  {
    "id": "theme_12345",
    "name": "Company Blue Theme",
    "description": "Custom blue theme for company branding",
    "category": "custom",
    "status": "active",
    "colors": {
      "primary": "#2563eb",
      "secondary": "#3b82f6",
      "background": "#ffffff",
      "surface": "#f3f4f6",
      "text": "#111827",
      "textSecondary": "#6b7280",
      "error": "#ef4444",
      "warning": "#f59e0b",
      "success": "#10b981",
      "info": "#3b82f6",
      "border": "#e5e7eb",
      "headerBackground": "#2563eb",
      "headerText": "#ffffff",
      "buttonBackground": "#2563eb",
      "buttonText": "#ffffff",
      "linkColor": "#2563eb"
    },
    "fonts": {
      "primary": "System",
      "heading": "System",
      "body": "System",
      "button": "System",
      "sizes": {
        "xs": 10,
        "sm": 12,
        "md": 14,
        "lg": 16,
        "xl": 20,
        "xxl": 24
      },
      "weights": {
        "light": "300",
        "regular": "400",
        "medium": "500",
        "semibold": "600",
        "bold": "700"
      }
    },
    "images": {
      "logo": "",
      "background": "",
      "welcomeImage": ""
    },
    "spacing": {
      "xs": 4,
      "sm": 8,
      "md": 16,
      "lg": 24,
      "xl": 32,
      "xxl": 48
    },
    "borderRadius": {
      "none": 0,
      "sm": 4,
      "md": 8,
      "lg": 12,
      "xl": 16,
      "full": 9999
    },
    "shadows": {
      "none": "none",
      "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
    },
    "animations": {
      "duration": {
        "fast": 150,
        "normal": 300,
        "slow": 500
      },
      "easing": {
        "linear": "linear",
        "easeIn": "ease-in",
        "easeOut": "ease-out",
        "easeInOut": "ease-in-out"
      }
    },
    "formConfig": {
      "defaultFormIds": [],
      "formOrder": [],
      "hiddenFormIds": [],
      "formStyles": {}
    },
    "layoutConfig": {
      "showLogo": true,
      "logoPosition": "center",
      "showCompanyName": true,
      "showWelcomeMessage": true,
      "welcomeMessage": "Welcome!",
      "showDateTime": true,
      "showLocationInfo": true
    },
    "companyId": "company_123",
    "createdBy": "user_456",
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T15:30:00Z",
    "version": 1
  }
]
```

### 2. Create Theme
```
POST /api/themes
```
**Headers:**
- `Content-Type: application/json`
- `X-Device-Token: {deviceToken}` (optional)

**Body:** Same as theme object above (without id, createdAt, updatedAt)

**Response:**
```json
{
  "id": "theme_12345",
  "message": "Theme created successfully"
}
```

### 3. Update Theme
```
PUT /api/themes/{themeId}
```
**Headers:**
- `Content-Type: application/json`
- `X-Device-Token: {deviceToken}` (optional)

**Body:** Same as theme object

**Response:**
```json
{
  "message": "Theme updated successfully"
}
```

### 4. Delete Theme
```
DELETE /api/themes/{themeId}
```
**Headers:**
- `X-Device-Token: {deviceToken}` (optional)

**Response:**
```json
{
  "message": "Theme deleted successfully"
}
```

### 5. Get Active Theme (Optional)
```
GET /api/themes/active?companyId={companyId}
```
**Response:**
```json
{
  "theme": { /* theme object */ },
  "isActive": true
}
```

## Database Table Schema

### themes
```sql
CREATE TABLE themes (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('default', 'seasonal', 'brand', 'event', 'custom') DEFAULT 'custom',
  status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
  
  -- Theme data stored as JSON
  colors JSON NOT NULL,
  fonts JSON NOT NULL,
  images JSON,
  spacing JSON,
  border_radius JSON,
  shadows JSON,
  animations JSON,
  form_config JSON,
  layout_config JSON,
  
  -- Company isolation
  company_id VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version INT DEFAULT 1,
  
  -- Indexes
  INDEX idx_company_id (company_id),
  INDEX idx_status (status),
  INDEX idx_category (category)
);
```

### theme_activations (Optional)
```sql
CREATE TABLE theme_activations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id VARCHAR(255) NOT NULL,
  theme_id VARCHAR(255),
  theme_type ENUM('builtin', 'custom') DEFAULT 'custom',
  builtin_theme_name VARCHAR(50), -- For built-in themes like 'hightech'
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activated_by VARCHAR(255),
  
  UNIQUE KEY unique_company_activation (company_id),
  FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE SET NULL,
  INDEX idx_company_id (company_id)
);
```

## Security & Access Control

### Company Isolation
- All theme operations must include `companyId` filter
- Users can only access themes belonging to their company
- Device token validation for additional security

### Permissions
- `READ`: View company themes
- `CREATE`: Create new themes
- `UPDATE`: Modify existing themes (created by same company)
- `DELETE`: Delete themes (created by same company)
- `APPLY`: Activate themes for the company

## Error Responses

### 404 - No Themes Found
```json
{
  "error": "No themes found for company",
  "code": "THEMES_NOT_FOUND"
}
```

### 403 - Access Denied
```json
{
  "error": "Access denied to theme",
  "code": "ACCESS_DENIED"
}
```

### 400 - Validation Error
```json
{
  "error": "Invalid theme data",
  "code": "VALIDATION_ERROR",
  "details": ["colors.primary is required", "name cannot be empty"]
}
```