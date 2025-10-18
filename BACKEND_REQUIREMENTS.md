# Backend Requirements for Google OAuth with Phone Number

## Overview
The frontend now collects phone numbers during Google OAuth registration and login. The backend needs to be updated to accept and process this additional field.

## Frontend Changes Made

### 1. **Registration Flow (DoctorRegister.jsx)**
When a user clicks "Sign up with Google":
1. Google OAuth completes successfully
2. A dialog prompts the user to enter their phone number
3. The frontend sends the following payload to the backend:

```javascript
{
  "access_token": "google_credential_token",
  "backend": "google-oauth2",
  "grant_type": "convert_token",
  "is_provider": true,
  "phone_number": "+2347012345678",  // NEW FIELD
  "invite_code": "optional_referral_code"  // Optional
}
```

**Headers sent:**
```javascript
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "X-Organization-Domain": "provider.prestigehealth.app"
}
```

### 2. **Login Flow (DoctorLogin.jsx)**
When a user clicks "Sign in with Google":
1. First attempt: Try to login without phone number
2. Backend returns 200 OK with user object
3. **Frontend checks:** `if (!result.user.phone_number || result.user.phone_number.trim() === '')`
4. If phone number is missing: ✨ Phone number dialog appears
5. User enters phone number and submits
6. Second API call with phone number included
7. Complete authentication → Redirect to dashboard

## Backend Requirements

### 1. **Update Google OAuth Endpoint**

**Endpoint:** `POST /auth/google/`

**Required Changes:**

#### Accept Optional Phone Number
The endpoint should accept an optional `phone_number` field in the request body:

```python
# Example Django/DRF implementation
class GoogleOAuthView(APIView):
    def post(self, request):
        access_token = request.data.get('access_token')
        backend = request.data.get('backend')
        grant_type = request.data.get('grant_type')
        is_provider = request.data.get('is_provider', False)
        phone_number = request.data.get('phone_number')  # NEW: Accept phone number
        invite_code = request.data.get('invite_code')
        organization_domain = request.headers.get('X-Organization-Domain')
        
        # Your existing Google OAuth logic...
        # When creating/updating user:
        if phone_number:
            user.phone_number = phone_number
            user.save()
```

#### Validation
- Validate phone number format (international format: +[country code][number])
- Phone number should be optional during initial OAuth
- If user exists but lacks phone number, return appropriate error

#### Response Scenarios

**Scenario 1: New User Registration (with phone number)**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 3,
    "phone_number": "+2347065675104",
    "email": "yiabzone@yahoo.com",
    "first_name": "Aibueku",
    "last_name": "Uyi",
    "middle_name": "",
    "profile_set": true,
    "organization_set": true,
    "bvn_verified": "NOT_VERIFIED",
    "provider_rate_set": true,
    "availability_set": true,
    "referral_code": "7G8SL8",
    "health_check_done": false,
    "reg_number_set": true,
    "longitude": "",
    "latitude": "",
    "address": "",
    "organization_id": 6
  }
}
```

**Scenario 2: Existing User Login (with phone number)**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 3,
    "phone_number": "+2347065675104",
    "email": "yiabzone@yahoo.com",
    "first_name": "Aibueku",
    "last_name": "Uyi",
    "middle_name": "",
    "profile_set": true,
    "organization_set": true,
    "bvn_verified": "NOT_VERIFIED",
    "provider_rate_set": true,
    "availability_set": true,
    "referral_code": "7G8SL8",
    "health_check_done": false,
    "reg_number_set": true,
    "longitude": "",
    "latitude": "",
    "address": "",
    "organization_id": 6
  }
}
```

**Scenario 3: User Needs Phone Number (Login)**
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "user": {
    "id": 3,
    "phone_number": "",  // Empty string or null
    "email": "yiabzone@yahoo.com",
    "first_name": "Aibueku",
    "last_name": "Uyi",
    "middle_name": "",
    "profile_set": true,
    "organization_set": true,
    "bvn_verified": "NOT_VERIFIED",
    "provider_rate_set": true,
    "availability_set": true,
    "referral_code": "7G8SL8",
    "health_check_done": false,
    "reg_number_set": true,
    "longitude": "",
    "latitude": "",
    "address": "",
    "organization_id": 6
  }
}
```
*Status Code: 200* (Success, but phone number is missing)

**Scenario 4: Registration Error**
```json
{
  "non_field_errors": ["Phone number already exists"],
  "message": "Registration failed"
}
```
*Status Code: 400*

### 2. **Database Schema**

Ensure your User model has:
```python
class User(AbstractUser):
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_provider = models.BooleanField(default=False)
    # ... other fields
```

### 3. **Organization Domain Handling**

The frontend sends `X-Organization-Domain: provider.prestigehealth.app` header:
- Use this to automatically set `is_provider=true`
- Create provider profile and doctor listing (NGN 5,000 consultation fee)
- Associate user with the correct organization

### 4. **Referral Code Support**

If `invite_code` is present in the request:
- Validate the referral code
- Link the new user to the referrer
- Apply any referral bonuses/benefits

## Testing Checklist

### Registration with Google
- [ ] User can register with Google + phone number
- [ ] Phone number is validated (international format)
- [ ] Provider profile is created automatically
- [ ] Doctor listing is created with default consultation fee
- [ ] Organization is set correctly based on domain header
- [ ] Referral code is processed if provided

### Login with Google
- [ ] Existing user can login without phone number prompt (phone_number present in user object)
- [ ] User with missing phone number gets phone number prompt (phone_number empty/null in user object)
- [ ] Phone number is saved correctly on second API call
- [ ] JWT tokens are returned with complete user object
- [ ] User data includes all required fields from sample response

### Error Handling
- [ ] Invalid phone number format returns clear error
- [ ] Missing access token returns error
- [ ] Invalid Google token returns error
- [ ] Duplicate phone numbers are handled
- [ ] Network errors are caught gracefully

## API Example Requests

### Registration Request
```bash
curl -X POST https://service.prestigedelta.com/auth/google/ \
  -H "Content-Type: application/json" \
  -H "X-Organization-Domain: provider.prestigehealth.app" \
  -d '{
    "access_token": "google_oauth_credential_token",
    "backend": "google-oauth2",
    "grant_type": "convert_token",
    "is_provider": true,
    "phone_number": "+2347012345678",
    "invite_code": "ABC123"
  }'
```

### Login Request (with phone)
```bash
curl -X POST https://service.prestigedelta.com/auth/google/ \
  -H "Content-Type: application/json" \
  -H "X-Organization-Domain: provider.prestigehealth.app" \
  -d '{
    "access_token": "google_oauth_credential_token",
    "backend": "google-oauth2",
    "grant_type": "convert_token",
    "is_provider": true,
    "phone_number": "+2347012345678"
  }'
```

## Security Considerations

1. **Phone Number Verification**: Consider adding SMS verification for phone numbers
2. **Rate Limiting**: Implement rate limiting on Google OAuth endpoint
3. **Token Validation**: Always validate Google OAuth tokens server-side
4. **Unique Constraints**: Ensure phone numbers are unique in the database
5. **CORS**: Ensure provider.prestigehealth.app is in allowed origins

## Frontend Validation

The frontend already validates:
- Phone number format (international: +[country code][number])
- Required field presence
- Examples shown: "+2347012345678"

## Next Steps

1. Update the backend Google OAuth endpoint to accept `phone_number`
2. Add phone number validation logic
3. Update user creation/update logic to include phone number
4. Test all scenarios (new user, existing user, with/without phone)
5. Deploy backend changes
6. Test frontend integration with updated backend
