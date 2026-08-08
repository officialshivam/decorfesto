# DecorFesto Backend Foundation

This backend foundation provides a local, AWS-friendly API layer for the initial Phase 2A milestone.

## What is included
- Local HTTP API server
- API routes for decorations, customers, vendors, service areas, and orders
- JSON-based local data persistence under backend/.data
- Basic role-based access checks for admin/vendor/customer flows
- Seed data from the existing frontend catalog

## How to run locally
1. Install dependencies if needed:
   - npm install
2. Start the backend:
   - npm run backend
3. The API will be available at:
   - http://localhost:4000/health

## Example requests
### List decorations
curl http://localhost:4000/decorations

### Create a customer
curl -X POST http://localhost:4000/customers \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Customer","email":"test@example.com","phone":"9876543210"}'

### Create an order
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -d '{"decorationId":"decoration-1","decorationName":"Romantic Birthday Balloon Decoration","customerId":"customer-001","customerName":"Test Customer","customerEmail":"test@example.com","customerPhone":"9876543210","customization":{"theme":"Classic"},"pincode":"110001","scheduledDate":"2026-09-01","scheduledTime":"10:00 AM","deliveryAddress":"123, Sample Street","subtotal":12999,"serviceCharge":299,"totalAmount":13298}'

### Admin create vendor
curl -X POST http://localhost:4000/vendors \
  -H "Content-Type: application/json" \
  -H "X-User-Role: admin" \
  -d '{"name":"Vendor One","contactName":"Alex","email":"vendor@example.com","phone":"9876543210","specialties":["Floral"]}'

## Notes
- This milestone does not include payment integration, AI features, SNS notifications, or the admin UI.
- AWS credentials are not required for local development.
- For AWS deployment, Cognito, API Gateway, Lambda, DynamoDB, S3, and SNS still need to be configured separately.
