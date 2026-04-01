# GB OrderFlow
## Dealer Ordering System
### Complete End-to-End System Design, UX Strategy, and Delivery Blueprint

Prepared as a strategic, business, functional, and technical proposal for leadership, operations, sales, IT, ERP, and delivery teams.

---

## Document Purpose

This document defines the complete planned approach for GB OrderFlow, a dealer ordering platform designed to:

- allow dealers to place orders digitally through a very simple web experience
- allow Head Office to review, approve, or reject those orders
- generate ERP-compatible CSV files after approval
- eliminate manual ERP data entry
- improve order quality, speed, control, auditability, and scale

This proposal is intentionally written for mixed audiences:

- CEO and leadership teams who need business clarity, ROI logic, and operating impact
- operations and sales teams who need usable workflows
- technology teams who need architecture, API, database, and deployment detail
- ERP teams who need clear export and mapping expectations

This document also explicitly addresses a critical business reality:

- many dealer and sub-dealer users may not be comfortable with complex software
- many may prefer simple visual flows over text-heavy systems
- some may rely on mobile devices, low bandwidth, or assisted ordering

For that reason, the system is designed not as a traditional enterprise dashboard for all users, but as:

- a guided, highly simplified ordering experience for dealers and sub-dealers
- a controlled, data-rich operational console for Head Office

---

## How to Read This Document

If the audience is leadership:

- focus on Executive Summary, Business Impact, End-to-End Flow, Risk Management, Final Outcome

If the audience is operations and sales:

- focus on User Journey, UX Strategy, Functional Scope, Team Requirements, Rollout Approach

If the audience is technology:

- focus on Architecture, Technology Stack, API Design, Security, Database, Performance, Deployment

If the audience is ERP:

- focus on ERP Integration, CSV Strategy, Validation Rules, Export Control, Team Requirements

---

## 1. Executive Summary

### 1.1 Business Problem

GB requires a structured order capture process that is faster, cleaner, more traceable, and easier to operate than a manual or fragmented workflow. In many dealer-driven businesses, orders are often collected through phone calls, messages, spreadsheets, or ad hoc digital channels, then reviewed internally, and finally re-entered into ERP by administrative staff. This creates multiple business problems:

- order data may be incomplete or inconsistent
- manual entry takes time and introduces avoidable mistakes
- dealers receive inconsistent service depending on who captures their order
- Head Office has limited standardization in review and approval
- ERP data quality depends too heavily on manual effort
- scale becomes difficult as dealer count, SKU count, and order frequency increase

The most important complication in this case is user behavior and digital comfort level. A system can be technically excellent and still fail commercially if the dealer or sub-dealer user experience is too complex. If users are not comfortable reading long forms, understanding ERP terms, typing product codes, or navigating multiple screens, adoption will drop. Sales teams will then fall back to manual assistance, and the intended efficiency gains will not be realized.

### 1.2 Proposed Solution

GB OrderFlow is proposed as a web-based dealer ordering platform with two role-specific experiences:

- **Dealer/Sub-dealer Experience:** a highly simplified, mobile-first, visual ordering flow with large product cards, large quantity controls, minimal typing, minimal text, simple confirmations, local-language support, and guided steps
- **Head Office Experience:** a controlled administrative workflow where submitted orders are reviewed, validated, approved or rejected, and then exported in ERP-compatible CSV format

The core idea is simple:

1. Dealer places order digitally
2. Head Office checks and approves
3. System generates CSV
4. ERP import happens without manual re-entry

### 1.3 Strategic Goal

The platform should not only digitize order entry. It should create a more scalable operating model by combining:

- simple order capture for field users
- stronger internal control for Head Office
- reliable structured output for ERP

### 1.4 Key Business Benefits

- Reduced manual order handling effort
- Elimination of repetitive ERP data entry
- Better order accuracy and fewer operational errors
- Faster turnaround from order submission to internal processing
- Better visibility of pending, approved, rejected, and exported orders
- Better audit trail for who approved what and when
- Better ability to scale dealer operations across regions and products
- Better usability for less-technical users

### 1.5 Business Impact

This system reduces 4-5 hours of daily manual ERP data entry to a single CSV upload step, significantly improving operational efficiency, accuracy, and scalability.

### 1.6 Key Design Principle

The most important product principle is:

> The dealer-side application must feel extremely easy, almost like a guided shopping tool, not a complicated enterprise system.

### 1.7 Why This Design Works

This design works because it separates simplicity for dealers and sub-dealers from control for Head Office, which improves field adoption while preserving strict internal governance and ERP compatibility.

This principle drives the UX, API, validation, status messaging, and support strategy across the entire solution.

---

## 2. Business Context, Goals, and Success Criteria

### 2.1 Primary Business Goals

- digitize dealer order capture
- simplify dealer and sub-dealer ordering
- centralize order review
- reduce manual rework inside Head Office
- remove manual ERP data entry
- improve order visibility and process control

### 2.2 Operational Goals

- standardize order format
- reduce back-and-forth clarification on incomplete orders
- reduce duplicate orders
- improve approval traceability
- ensure clean ERP import files

### 2.3 Adoption Goals

- make ordering possible for low-digital-confidence users
- reduce required reading and typing
- support mobile-first usage
- allow rapid onboarding of new dealers
- reduce dependency on training-heavy processes

### 2.4 Success Criteria

The solution can be considered successful when it produces measurable outcomes such as:

- high dealer order completion rate
- low support dependency for basic order placement
- low duplicate order rate
- low export rejection rate from ERP
- reduced manual order entry time at Head Office
- clear auditability for order decisions

### 2.5 System Enforcement Rules

The following rules are mandatory and should be treated as non-negotiable system controls:

1. Dealers will **not** be able to see:
   - discount percentage
   - net amount calculation logic
   - pricing tiers
   - any other dealer’s data
2. Discount entry will be available **only** in the Head Office portal during the approval process.
3. The ERP system will **not** be modified or accessed directly by this application.
   - integration will happen **only** through CSV export
4. Only Head Office users will be able to approve or reject orders.
5. All key actions including order creation, approval, rejection, CSV generation, and export attempts will be logged for audit purposes.
6. Dealers will see only a simple order summary and final order outcome.
   - discount breakdown and internal pricing logic will remain hidden

### 2.6 Dealer Visibility Rules

| Dealer Can See | Dealer Cannot See |
|---|---|
| product name and image | discount percentage |
| quantity selected | net amount calculation |
| order status | pricing tiers |
| final order confirmation | stock levels if business chooses to hide them |
| own order history | any other dealer data |

### 2.7 Planned Scale Assumptions

The planned solution should be sized for the following expected operating model:

- approximately **100 dealers**
- approximately **500 sub-dealers**
- approximately **2,500 SKUs**
- expected daily order volume of **100 to 300 orders**

These numbers should guide pagination, indexing, API sizing, operational dashboards, and rollout planning.

---

## 3. Product Vision and Design Principles

### 3.1 Product Vision

GB OrderFlow should become the standard digital path through which dealers submit structured orders to Head Office in a way that is operationally controlled, technically reliable, and simple enough for broad field adoption.

### 3.2 Guiding Product Principles

- **Simple first:** start from what a low-literacy, low-tech-comfort user can do easily
- **Visual over textual:** rely more on images, icons, cards, and large touch actions
- **One task at a time:** avoid crowded screens and multi-purpose pages
- **Safe by design:** protect against double submission, confusing states, and partial completion
- **Controlled internally:** keep all key validation and approval logic server-side
- **Mobile-first:** assume many users will use smartphones
- **Operationally traceable:** every approval, rejection, and export should be auditable
- **ERP-ready:** approval must lead to structured downstream output without manual retyping

### 3.3 UX Principles for Dealer and Sub-dealer Users

- Minimize text wherever possible
- Prefer product photos and category icons over technical lists
- Use local language and simple English/Hinglish labels
- Avoid hidden features and overloaded menus
- Use large tap areas and large buttons
- Use `+` and `-` for quantities
- Avoid requiring users to remember codes
- Offer repeat-last-order shortcuts
- Provide clear confirmations and friendly status messages
- Keep each screen focused on one decision

### 3.4 UX Principles for Head Office Users

- Provide clear operational queue management
- Keep filters and data density efficient
- Show approval context cleanly
- Make approval history easy to understand
- Keep export controls explicit and traceable

---

## 4. User Personas and Field Realities

### 4.1 Dealer Owner

Typical profile:

- responsible for ordering stock
- may use smartphone more often than desktop
- may prefer simple, fast reordering over browsing large catalogs
- may not want to read long instructions

What this user needs:

- very fast login
- repeat last order
- clear product images
- easy quantity entry
- clear status after placing order

### 4.2 Sub-dealer Counter Operator

Typical profile:

- may be less comfortable with software
- may know products visually rather than by internal code
- may work in a busy environment
- may make smaller but frequent orders

What this user needs:

- category-first navigation
- visual product selection
- local language
- reduced typing
- clear cart and order confirmation

### 4.3 Salesman-Assisted User

Typical profile:

- order may be placed by sales representative on behalf of dealer/sub-dealer
- useful when dealer user is not comfortable using the system alone

What this user needs:

- quick assisted ordering mode
- dealer selection
- repeatable templates
- history access
- field-friendly interface

### 4.4 Head Office Approver

Typical profile:

- responsible for reviewing order quality and business fit
- needs clear queue, filters, order details, status transitions, and audit trail

What this user needs:

- pending order list
- dealer filter
- quick item review
- approve/reject with note
- export readiness visibility

### 4.5 ERP Operator or Operations Admin

Typical profile:

- responsible for importing or handing off approved order files

What this user needs:

- exportable file list
- clear file format rules
- export history
- failed export reason visibility

### 4.6 Real-World Constraints That Must Shape the Design

- low digital literacy in some dealer segments
- frequent mobile usage
- weak or inconsistent internet in some areas
- product recognition by image or pack type rather than by code
- preference for calling support when confused
- low patience for multi-step forms
- possible need for local-language and guided assistance

---

## 5. Functional Scope

### 5.1 In Scope

- dealer login and session management
- sub-dealer or assisted ordering model if approved by business
- SKU browsing and product search
- category-based navigation
- cart creation and editing
- order submission
- dealer order history
- Head Office pending order review
- Head Office discount entry during approval
- Head Office approval and rejection
- approval notes and rejection reasons
- ERP-compatible CSV generation
- export tracking and audit trail

### 5.2 Recommended Additions

- repeat last order
- favorite products
- recently ordered products
- local language support
- OTP login for dealer users
- support phone button on every dealer screen
- downloadable or printable order acknowledgment
- simple notifications such as in-app status or SMS

### 5.3 Optional Advanced Scope

- salesman-assisted ordering mode
- sub-dealer hierarchy
- credit limit checks
- product availability integration
- image-based product browse
- barcode or QR-based reorder
- offline order draft mode
- ERP import result feedback loop

### 5.4 Out of Scope for Core Release

- full ERP API integration
- real-time inventory reservation
- dynamic route planning
- AI forecasting
- full CRM functionality
- payment collection and settlement modules

---

## 6. End-to-End Flow (User Journey)

### 6.1 Standard Dealer Ordering Flow

1. Dealer opens app
2. Dealer logs in
3. Dealer selects language if needed
4. Dealer sees simple home screen with categories
5. Dealer opens category
6. Dealer sees product cards
7. Dealer adjusts quantity using large controls
8. Dealer opens cart
9. Dealer reviews summary
10. Dealer taps **Place Order**
11. System validates order
12. System creates order in pending state
13. Dealer sees success screen
14. Head Office later reviews the order
15. Order is approved or rejected
16. Approved order becomes available for CSV export

### 6.2 Recommended Fast Reorder Flow

1. Dealer opens app
2. Dealer selects **Repeat Last Order**
3. System shows previous order with editable quantities
4. Dealer confirms or changes a few lines
5. Dealer submits order

### 6.3 Assisted Ordering Flow

1. Salesman or support user logs in to assisted mode
2. Selects dealer/sub-dealer
3. Uses same simple product selection interface
4. Places order on dealer’s behalf
5. System records who created the order and for whom

### 6.4 Head Office Flow

1. Head Office user logs in
2. Opens pending orders queue
3. Reviews order details
4. Enters discount percentage during approval
5. Approves or rejects
6. Adds note or reason
7. Approved order becomes export-ready
8. CSV is generated and handed off to ERP process

### 6.5 ERP Integration Flow

1. Dealer places order
2. Order status becomes `PENDING`
3. Head Office reviews order
4. Head Office enters discount percentage
5. Head Office clicks **Approve**
6. System generates CSV file instantly
7. Head Office downloads CSV
8. CSV is uploaded into ERP using the **Import Sales Bill** process

### 6.6 Simplified Business Explanation

Dealer chooses products, adds quantity, and places order.  
Head Office checks and approves.  
System creates the ERP file.  
ERP receives the order data without manual typing.

---

## 7. UX Strategy for Low-Literacy and Low-Tech-Comfort Users

This section is critical. In this project, UX is not only about appearance. It is the main driver of real-world adoption.

### 7.1 Core UX Position

The dealer-side UI should feel closer to:

- a shopping app
- a guided order assistant
- a visual reorder tool

It should not feel like:

- an ERP screen
- a spreadsheet
- a form-heavy enterprise portal

### 7.2 Recommended UX Rules

- very limited text per screen
- avoid abbreviations unless users already understand them
- use product images whenever possible
- use icons and category tiles
- large fixed bottom action buttons
- one main action per screen
- avoid deep menu nesting
- keep cart visible and easy to reopen
- confirm every important action with simple language

### 7.3 Login Strategy Options

#### Option A: Mobile Number + OTP

Best for:

- low-tech users
- users who forget passwords
- mobile-first adoption

#### Option B: Simple Username + Password

Best for:

- environments where OTP infrastructure is not preferred initially

#### Recommended Direction

If business and infrastructure allow, OTP is recommended for dealer and sub-dealer access. Head Office can continue using stronger standard credential flows.

### 7.4 Language Strategy

Recommended design:

- support English plus one or more local languages
- allow language selection at first login
- store preference in user profile or browser state
- keep terminology simple and consistent

### 7.5 Product Discovery Strategy

Recommended options:

- category cards
- product image cards
- large search bar
- recent orders section
- favorite products section
- repeat last order section

Avoid for dealer UI:

- large grid tables
- tiny text-heavy rows
- long filter forms
- mandatory code entry

### 7.6 Quantity Entry Strategy

Best practice:

- use `+` and `-` stepper controls
- optionally allow numeric edit on tap
- show pack size clearly
- validate instantly if quantity rule is violated

### 7.7 Confirmation and Status Strategy

Users should always know what happened.

Examples:

- `Your order is sent`
- `Head Office will review your order`
- `Order approved`
- `Order rejected, please contact support`

### 7.8 Help and Support Strategy

Recommended support helpers:

- call support button on key screens
- order help icon
- salesman-assisted ordering option
- guided onboarding images
- short local-language help content

### 7.9 Dealer UX Do and Do Not Table

| Do | Do Not |
|---|---|
| Use large visual cards | Use dense enterprise tables |
| Use simple words | Use ERP or technical vocabulary |
| Use minimal typing | Depend on manual code entry |
| Keep one task per screen | Mix multiple decisions in one screen |
| Provide repeat order shortcuts | Force full browsing every time |
| Support mobile-first layout | Assume desktop-only use |

---

## 8. System Architecture

### 8.1 Architectural Overview

The proposed solution is a layered web application with clear boundaries between presentation, business logic, persistence, and ERP output.

| Layer | Responsibility | Description |
|---|---|---|
| Frontend Layer | User interaction | React web application serving Dealers, Sub-dealers, Head Office, and optional support users |
| Backend Layer | Business orchestration | Node.js and Express service handling auth, validation, workflow, rules, export generation, and logging |
| Database Layer | Persistent storage | Existing SQL environment storing master data, orders, workflow state, and audit records |
| Integration Layer | ERP output | CSV generation, validation, export control, and downstream handoff tracking |

### 8.2 System Design Diagram

```text
Dealer Mobile / Desktop
        ->
React UI (Dealer Portal / Head Office Portal)
        ->
Node.js + Express API Layer
        ->
Business Services + Validation + Security
        ->
SQL Database
        ->
CSV Generator
        ->
ERP Import Sales Bill Process
```

### 8.3 Basic Sequence Flow

```text
Dealer -> API -> Validate -> DB Save -> Order Status = Pending
Head Office -> Review -> Enter Discount % -> Approve
System -> Generate CSV -> Head Office Downloads -> ERP Upload
```

### 8.4 Architectural Principle for Low-Literacy UX

The UI may appear simple, but the underlying backend must be strict, transactional, and auditable. Simplicity on the surface should not reduce control underneath.

---

## 9. Technology Stack (with Why)

### 9.1 Tech Stack Summary

- React: mobile-first, component-based UI
- Node.js + Express: scalable backend and API layer
- PostgreSQL: reliable structured data storage
- CSV Export: simple and ERP-compatible integration

### 9.2 Frontend: React + TypeScript

Why React:

- component-based architecture suits product cards, cart items, order cards, and reusable operational widgets
- good ecosystem for mobile-friendly responsive interfaces
- suitable for role-based UI composition

Why TypeScript:

- stronger API contract safety
- better maintainability
- safer scaling as business logic grows

### 9.3 UI Framework: MUI

Why MUI:

- high-quality responsive components
- accessible forms and layout primitives
- enterprise-ready tables, dialogs, chips, cards, pagination
- faster consistent development

### 9.4 Backend: Node.js + Express

Why Node.js:

- strong fit for API-driven systems
- efficient development speed
- broad ecosystem

Why Express:

- lightweight
- flexible middleware model
- easy to organize around modules and services
- works well for REST APIs with auth, validation, and export endpoints

### 9.5 Database: PostgreSQL / Existing SQL

Why relational SQL:

- strong transactional guarantees
- foreign key support
- indexing and filtering support
- easier reporting and reconciliation
- appropriate for order workflows

### 9.6 File Integration: CSV

Why CSV:

- ERP import-friendly
- easy to validate
- easy to audit
- practical where real-time ERP API integration is not part of initial scope

### 9.7 Technology Choice Summary Table

| Area | Technology | Why |
|---|---|---|
| Frontend | React + TypeScript | reusable, maintainable, strong UI composition |
| UI Library | MUI | responsive enterprise-grade component base |
| Backend | Node.js + Express | fast API development and flexible service design |
| Database | PostgreSQL / existing SQL | relational integrity and operational fit |
| Auth | JWT + refresh tokens | secure scalable session model |
| Export | CSV | lowest-friction ERP import approach |

---

## 10. API Design

### 10.1 API Design Principles

- all APIs exposed under `/api/v1`
- JSON request/response format except CSV download
- all protected routes require authenticated session
- role checks enforced server-side
- all requests validated before business logic
- all important actions logged with request context

### 10.2 Standard API Response Pattern

Recommended success response style:

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": "Optional human-readable message"
}
```

Recommended error response style:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check the request and try again",
    "details": []
  },
  "requestId": "req_123"
}
```

### 10.3 Authentication APIs

#### POST /api/v1/auth/login

**Purpose**

Authenticate dealer, sub-dealer, or Head Office user and establish a secure session.

**Request Example**

```json
{
  "username": "dealer_001",
  "password": "SecurePassword123"
}
```

**Response Example**

```json
{
  "user": {
    "id": "usr_1024",
    "role": "DEALER",
    "name": "Eastern Distributors",
    "dealerId": "DLR001"
  },
  "csrfToken": "c7a9d6d4f0..."
}
```

**Security Considerations**

- HTTPS only
- rate limiting
- password hash verification
- generic failure message
- secure cookies for access and refresh tokens

#### POST /api/v1/auth/refresh

**Purpose**

Refresh access token using a valid refresh token.

**Request Example**

```json
{}
```

**Response Example**

```json
{
  "user": {
    "id": "usr_1024",
    "role": "DEALER",
    "name": "Eastern Distributors",
    "dealerId": "DLR001"
  },
  "csrfToken": "newCsrfTokenValue"
}
```

**Security Considerations**

- rotate refresh tokens
- reject expired or revoked sessions
- store session trail
- log refresh misuse attempts

#### POST /api/v1/auth/logout

**Purpose**

Terminate the current session and revoke refresh state.

**Request Example**

```json
{}
```

**Response Example**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 10.4 Dealer APIs

#### GET /api/v1/skus

**Purpose**

Return a paginated, searchable list of products available to the logged-in dealer.

**Request Example**

```http
GET /api/v1/skus?page=1&pageSize=20&search=pvc&category=pipes
```

**Response Example**

```json
{
  "data": [
    {
      "skuId": "SKU1001",
      "skuCode": "GB-PVC-001",
      "description": "PVC Pipe 2 Inch",
      "uom": "PCS",
      "price": 145.5,
      "category": "Pipes",
      "imageUrl": "https://cdn.example.com/sku/gb-pvc-001.jpg",
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalRecords": 245,
    "totalPages": 13
  }
}
```

**Security Considerations**

- only authenticated users
- dealer should only see permitted SKUs
- validate pagination parameters

#### POST /api/v1/orders

**Purpose**

Create a new order from dealer-selected cart items.

**Request Example**

```json
{
  "dealerId": "DLR001",
  "dealerPoNumber": "PO-45891",
  "requestedDeliveryDate": "2026-04-05",
  "notes": "Urgent dispatch required",
  "idempotencyKey": "8e95f9c1-6b4b-4f47-9c2f-10efba59d4aa",
  "items": [
    { "skuId": "SKU1001", "quantity": 20 },
    { "skuId": "SKU1045", "quantity": 12 }
  ]
}
```

**Response Example**

```json
{
  "orderId": "ORD202604010001",
  "status": "PENDING_APPROVAL",
  "submittedAt": "2026-04-01T09:30:12Z",
  "totalItems": 2,
  "totalQuantity": 32
}
```

**Business Rules**

- dealer can only place order for own account unless assisted mode is explicitly allowed
- all items must reference active valid SKUs
- quantity must meet allowed range and format
- idempotency key prevents duplicate creation
- dealer confirmation view should remain simple and must not expose discount or internal pricing logic

#### GET /api/v1/orders

**Purpose**

Return order history for logged-in dealer.

**Request Example**

```http
GET /api/v1/orders?page=1&pageSize=10&status=PENDING_APPROVAL
```

**Response Example**

```json
{
  "data": [
    {
      "orderId": "ORD202604010001",
      "status": "PENDING_APPROVAL",
      "submittedAt": "2026-04-01T09:30:12Z",
      "dealerPoNumber": "PO-45891",
      "itemCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalRecords": 18,
    "totalPages": 2
  }
}
```

### 10.5 Head Office APIs

#### GET /api/v1/orders/pending

**Purpose**

Return the pending approval queue.

**Request Example**

```http
GET /api/v1/orders/pending?page=1&pageSize=25&dealerId=DLR001
```

#### POST /api/v1/orders/:id/approve

**Purpose**

Approve a pending order and make it export-ready.

**Request Example**

```json
{
  "discountPercent": 5,
  "approvalNotes": "Approved as submitted"
}
```

**Response Example**

```json
{
  "orderId": "ORD202604010001",
  "status": "APPROVED",
  "approvedBy": "usr_9001",
  "approvedAt": "2026-04-01T10:05:44Z",
  "exportStatus": "READY_FOR_EXPORT"
}
```

#### POST /api/v1/orders/:id/reject

**Purpose**

Reject a pending order and capture the reason.

**Request Example**

```json
{
  "reason": "Quantity exceeds approved credit limit"
}
```

### 10.6 CSV Export API

#### GET /api/v1/orders/:id/export

**Purpose**

Generate and return an ERP-compatible CSV file for an approved order.

**Request Example**

```http
GET /api/v1/orders/ORD202604010001/export
```

**Response Example**

```csv
OrderNumber,DealerCode,SKUCode,Quantity,UOM,RequestedDate
ORD202604010001,DLR001,GB-PVC-001,20,PCS,2026-04-05
ORD202604010001,DLR001,GB-PVC-045,12,PCS,2026-04-05
```

### 10.7 Recommended Additional APIs

- `GET /api/v1/me`
- `GET /api/v1/categories`
- `GET /api/v1/orders/:id`
- `GET /api/v1/health`

---

## 11. Security Strategy

### 11.1 Authentication Model

Use short-lived JWT access tokens plus refresh tokens.

- access token used for request authorization
- refresh token used for session continuity
- refresh tokens stored and revocable server-side

### 11.2 Cookie Strategy

Recommended cookie policy:

- `HttpOnly`
- `Secure`
- `SameSite=Lax` or stricter if suitable

### 11.3 Role-Based Access Control

Roles may include:

- dealer
- sub-dealer
- Head Office
- support/admin
- salesperson-assisted user if allowed

### 11.4 Input Validation

Every request must be schema-validated.

### 11.5 API Protection

- HTTPS-only transport
- rate limiting on auth and sensitive routes
- request correlation IDs
- structured security logging
- CSRF protection if cookie-based auth is used

### 11.6 Prevent Duplicate Actions

Core techniques:

- idempotency keys for order placement
- optimistic or pessimistic state checks for approval
- UI disable-on-submit behavior
- backend transaction lock or state version check

### 11.7 Real-World Slow Network Example

If a dealer clicks `Place Order` multiple times because the network is slow:

- only one order should be created
- repeated requests should reuse the same idempotency key
- the backend should prevent duplicate records
- the frontend should keep the button disabled until the first submission is resolved

---

## 12. Database Approach

### 12.1 Database Philosophy

The database should act as the structured operational record of truth. Because the platform deals with orders, approvals, and ERP exports, the data model must prioritize:

- referential integrity
- auditability
- transactional safety
- reporting readiness

### 12.2 High-Level Tables

| Table | Purpose |
|---|---|
| `users` | login identities and role assignment |
| `dealers` | dealer master data |
| `sub_dealers` | optional sub-dealer master data if that model is adopted |
| `skus` | product master data |
| `sku_categories` | visual grouping for product discovery |
| `orders` | order header record |
| `order_items` | order line items |
| `order_approvals` | approval and rejection history |
| `order_exports` | CSV generation and export status history |
| `refresh_sessions` | refresh token and session state |
| `audit_logs` | generalized security and business event trail |

### 12.3 Workflow Status Design

Suggested status values:

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `EXPORT_READY`
- `EXPORTED`
- `EXPORT_FAILED`

### 12.4 Transactions

Use transactions for:

- order header plus order lines creation
- approval state change plus approval log creation
- export record creation plus export status update

---

## 13. ERP Integration (CSV)

### 13.1 Why CSV Is the Right Initial Integration

CSV is practical because:

- many ERP systems support flat-file import
- it keeps integration scope manageable
- it is easy to validate and audit
- it reduces manual data entry immediately
- it allows ERP usage without modifying the ERP application itself

### 13.2 ERP Integration Flow

1. Dealer places order
2. Order status becomes `PENDING`
3. Head Office reviews the order
4. Head Office enters discount percentage
5. Head Office clicks **Approve**
6. System generates CSV file instantly
7. Head Office downloads CSV
8. CSV is uploaded into ERP through the **Import Sales Bill** process

### 13.3 Discount Handling

Discount handling must be explicit and controlled:

- discount is **not visible** to dealers at any stage
- discount percentage is entered **only by Head Office** during approval
- net amount is calculated as:

```text
Net Amount = Quantity × Rate × (1 - Discount / 100)
```

- only final order summary is shown to dealers
- detailed internal pricing logic, discount logic, and pricing tiers remain hidden from dealer users

### 13.4 Failure Handling Example

If CSV generation fails:

- the order should remain in `APPROVED` state
- `export_status` should become `FAILED`
- the failure reason should be recorded
- a retry option should be available for Head Office

---

## 14. Performance Strategy

### 14.1 Frontend Performance

- mobile-first layout
- lightweight initial bundle
- code splitting
- image optimization
- debounced search
- lazy loading where useful

### 14.2 SKU Browsing Performance

- pagination mandatory
- for approximately 2,500 SKUs, load only **20 to 50 items per page**
- category-first browsing to reduce load
- cache stable metadata where appropriate
- search input should use debounce to avoid excessive API calls

### 14.3 Backend Performance

- selective field queries
- indexed DB access
- efficient pagination
- avoid N+1 query patterns
- compact response payloads

### 14.4 Weak Network Strategy

Recommended approaches:

- retry order submission safely
- visible loading indicators
- preserve cart locally
- retry-friendly submission handling
- clear loading state
- clear success or failure confirmation
- never leave the user unsure whether the order was placed

---

## 15. Error Handling and Edge Cases

### 15.1 API Failures

User-facing behavior:

- show simple friendly message
- allow retry
- avoid technical wording

### 15.2 Invalid Data

Examples:

- missing quantity
- invalid date
- inactive SKU
- bad login data

### 15.3 Duplicate Orders

Prevention should combine:

- each order request should include an idempotency key
- submit button locking
- backend duplicate detection

### 15.4 Concurrency Issues

Examples:

- two Head Office users approving same order
- re-export while another export is in progress

### 15.5 Dealer Experience Edge Cases

- user closes app mid-order
- user loses signal during submit
- user forgets what was already submitted

### 15.6 ERP Export Edge Cases

- missing mapping codes
- invalid file format
- export generated twice
- ERP rejects file after upload
- CSV generation failure after approval

---

## 16. Notifications, Communication, and Support

### 16.1 Basic Notification Options

- order submitted confirmation
- order approved message
- order rejected message
- export-ready internal notification if needed

### 16.2 Recommended Channels

- in-app status
- SMS
- email for Head Office users

### 16.3 Support Features We Can Add

- one-tap call support
- sales representative contact button
- help center with images
- local-language support notes

### 16.4 Assisted Adoption Approaches

- salesperson-assisted ordering
- distributor office operator-assisted ordering
- branch kiosk ordering
- demo mode during onboarding

---

## 17. Basic Reporting and Operational Dashboards

### 17.1 Leadership Dashboard Suggestions

- total orders placed
- approval turnaround time
- export volume
- dealer adoption rate
- top ordering dealers
- order rejection rate

### 17.2 Head Office Operational Dashboard Suggestions

- pending approvals by age
- orders by region
- rejected orders and reasons
- export-ready count
- export failures

### 17.3 Minimal Adoption Visibility

- active dealer count
- orders per day
- pending approval count
- export success vs failure count

---

## 18. Testing and Quality Strategy

### 18.1 Testing Philosophy

Testing must prove not only that the system works technically, but that:

- it is easy enough for real dealer users
- it protects against duplicate and invalid workflows
- it produces correct ERP outputs

### 18.2 Test Types

- unit tests
- integration tests
- API contract tests
- role-based security tests
- UI flow tests
- CSV validation tests
- usability tests with real users

### 18.3 Usability Testing Is Mandatory

Because the user base includes low-literacy or low-tech-comfort users, usability testing should not be optional.

---

## 19. Development Approach (Step-by-Step)

### 19.1 Phase 1: Discovery and Alignment

- confirm business goals
- confirm user types
- confirm dealer digital comfort level
- confirm product catalog and dealer master data
- confirm ERP CSV structure
- finalize approval rules

### 19.2 Phase 2: UX and Product Design

- create wireframes for dealer flow
- create wireframes for Head Office flow
- validate with business and field users
- finalize language and content style

### 19.3 Phase 3: Backend Foundation

- auth and session model
- validation framework
- data access layer
- audit logging pattern
- role guard design

### 19.4 Phase 4: Core Business APIs

- product browsing
- order creation
- order history
- pending queue
- approval and rejection
- export

### 19.5 Phase 5: Frontend Build

- dealer login
- dealer catalog
- dealer cart
- dealer history
- Head Office dashboard
- approval workflow
- export screens

### 19.6 Phase 6: Integration and CSV Validation

- field mapping
- test file generation
- ERP sample validation
- export audit trail

### 19.7 Phase 7: Testing and Pilot Rollout

- internal testing
- field usability testing
- limited pilot rollout
- support observation
- feedback refinement

### 19.8 Phase 8: Production Rollout

- production deployment
- training and onboarding
- support setup
- monitoring and alerting

### 19.9 Recommended Delivery Timeline

The complete scoped solution can be delivered end-to-end in **2-3 weeks**.

This assumes business decisions, SQL access, sample CSV files, and approval inputs are available on time.

#### Week 1

- backend setup
- database alignment
- authentication and session handling
- SKU and order APIs
- validation and audit logging foundations

#### Week 2

- dealer portal
- product catalogue
- cart and order submission
- Head Office pending queue
- discount entry
- approval and rejection workflows

#### Week 3

- CSV generation
- ERP format validation
- integration testing
- usability validation
- production deployment and handover

If business inputs are shared quickly and ERP validation is not delayed, the system can be fully delivered inside the 2-3 week window.

---

## 20. What Is Required from Team

### 20.1 Business Team Inputs

- dealer list
- sub-dealer model decision
- SKU catalog
- category structure
- pricing visibility rules
- approval rules
- rejection reasons
- local language wording
- sample ordering scenarios
- product images

### 20.2 Technical Team Inputs

- SQL access
- schema documentation
- hosting decision
- environment setup
- SSL/domain setup
- monitoring standards
- logging standards
- backup and restore policy

### 20.3 ERP Team Inputs

- final CSV specification
- sample import files
- mandatory columns
- field length rules
- import validation rules
- file naming expectations
- upload ownership model

### 20.4 Sales and Operations Team Inputs

- dealer onboarding process
- who supports users in the field
- whether assisted ordering is needed
- how rejected orders are communicated

---

## 21. Deployment, Operations, and Support

### 21.1 Environment Model

Recommended environments:

- development
- testing or UAT
- production

### 21.2 Deployment Considerations

- secure backend hosting
- secure database access
- HTTPS and domain configuration
- environment-specific secrets management

### 21.3 Support Model

Recommended support structure:

- L1: dealer onboarding and basic usage support
- L2: operational issue review
- L3: technical issue resolution

---

## 22. Risk Management

| Risk | Impact | Mitigation |
|---|---|---|
| Low adoption by dealers | Business returns to manual order collection | ultra-simple UX, local language, assisted ordering, field testing |
| System downtime | Order placement and approval blocked | monitoring, backups, reliable hosting, runbooks |
| Data inconsistency | wrong orders and wrong exports | transactions, validations, constraints, audit logs |
| Duplicate orders | operational confusion and extra work | idempotency, submit locking, backend checks |
| Security breach | sensitive business data exposure | RBAC, HTTPS, secure cookies, validation, logging, token rotation |
| ERP file rejection | processing delays | strict CSV validation and ERP sample testing |
| Poor field connectivity | incomplete user experience | local cart persistence and retry strategy |

---

## 23. Future Enhancements and What Else We Can Do

Note: The following enhancements are optional future phases and are not part of the initial delivery scope.

### 23.1 Dealer Experience Enhancements

- repeat last order in one tap
- favorite product shortcuts
- recent product strip
- product image search
- pack-based quick order bundles
- language toggle from every screen

### 23.2 Low-Literacy Support Enhancements

- voice prompts in local language
- audio playback for product names
- picture-first reorder mode
- minimal-text easy mode
- step-by-step wizard mode

### 23.3 Assisted Ordering Enhancements

- salesman-assisted order entry
- call-center assisted order entry
- branch office assisted order mode

### 23.4 ERP and Integration Enhancements

- batch export mode
- scheduled export automation
- ERP API integration in future
- import result sync-back

### 23.5 Analytics and Governance Enhancements

- dealer adoption dashboard
- order funnel dashboard
- maker-checker approval layers
- region-based Head Office routing
- export authorization controls

---

## 24. Final Outcome

### 24.1 Final Business Outcome

GB OrderFlow should create a complete digital order path where:

- dealers can place orders easily
- Head Office remains in control
- approved data moves toward ERP in structured CSV form
- manual ERP data entry is removed from normal operations

### 24.2 Final User Outcome

Dealer and sub-dealer users get an ordering process that is:

- simple
- fast
- visual
- mobile-friendly
- less dependent on reading and typing

Head Office users get a process that is:

- controlled
- traceable
- auditable
- operationally efficient

### 24.3 Final Strategic Outcome

The solution is not only a software project. It is an operating model upgrade. If executed well, GB OrderFlow can become the standard mechanism through which dealer demand is digitally captured, internally governed, and systematically transferred into ERP processes with far less manual effort and far better clarity.

### 24.4 Closing Statement

The recommended direction is to build GB OrderFlow as a secure, role-based, API-driven ordering platform with an intentionally simplified dealer experience and a strong back-office approval process. By combining easy field usability with strict backend controls and ERP-compatible CSV generation, the business can improve adoption, reduce administrative effort, increase order accuracy, and build a scalable foundation for future digital growth.
