# Troubleshooting 500 Errors in Orders & Transactions

## Issue
The Orders and Transactions pages are showing 500 Internal Server Errors when trying to fetch data, even though there are orders and transactions in the database.

## Error Details
- **Orders endpoint**: `GET /api/coreadmin/orders/?page=1&limit=10` → 500 Error
- **Financial Reports endpoint**: `GET /api/coreadmin/financial-reports/` → 500 Error

## Root Causes

### 1. Backend Serializer Issues
The backend `OrderListSerializer` might be failing when:
- `created_by` is `None` (null foreign key)
- `created_by.get_full_name()` fails if user doesn't have first_name/last_name
- `get_razorpay_payment_id()` method fails when accessing related objects

### 2. Financial Reports Endpoint
The `financial-reports` endpoint requires **SuperAdmin** privileges. If the current user is not a SuperAdmin, it will return 403, but if there's an error in the endpoint logic, it returns 500.

### 3. Missing Error Handling
The backend views might not have proper try-catch blocks around serializer operations.

## Debugging Steps

### Step 1: Check Backend Logs
Check the Django server logs (console output) for the actual error traceback. The 500 error should show:
- The exact line where it fails
- The exception type and message
- The full stack trace

### Step 2: Check Database Data
Verify that:
- Orders have valid `created_by` foreign keys (not null)
- Users referenced by orders exist
- Order status values match expected values

### Step 3: Test API Directly
Use curl or Postman to test the endpoints:
```bash
# Test orders endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/coreadmin/orders/?page=1&limit=10

# Test financial reports endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/coreadmin/financial-reports/
```

### Step 4: Check User Permissions
Verify the logged-in user has:
- Admin profile (`AdminUserProfile` exists)
- Correct admin group (superadmin or moderator)
- Valid authentication token

## Potential Fixes

### Fix 1: Add Null Checks in Serializer
In `API/Orders/serializers.py`, update `OrderListSerializer`:

```python
def get_razorpay_payment_id(self, obj):
    """Get Razorpay payment ID if exists"""
    try:
        payments = get_related(obj, 'Order:RazorpayPayment', RazorpayPayment)
        if payments.exists():
            return payments.first().razorpay_payment_id
    except Exception as e:
        # Log error but don't fail
        print(f"Error getting Razorpay payment ID: {e}")
    return None
```

### Fix 2: Handle Null created_by
In `OrderListSerializer`, add null handling:

```python
user_name = serializers.SerializerMethodField()

def get_user_name(self, obj):
    if obj.created_by:
        return obj.created_by.get_full_name() or obj.created_by.username
    return 'Unknown User'
```

### Fix 3: Add Try-Catch in Backend View
In `API/CoreAdmin/views.py`, wrap serializer in try-catch:

```python
try:
    serializer = OrderListSerializer(orders_page, many=True)
except Exception as e:
    import traceback
    print(f"Serializer error: {e}")
    print(traceback.format_exc())
    return Response({
        'error': f'Error serializing orders: {str(e)}'
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### Fix 4: Create Dedicated Order Stats Endpoint
Instead of using `financial-reports` for order stats, create a dedicated endpoint:

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_stats(request):
    """Get order statistics (Moderator and SuperAdmin access)"""
    try:
        admin_profile = AdminUserProfile.objects.get(user=request.user)
    except AdminUserProfile.DoesNotExist:
        return Response({
            'error': 'Admin profile required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    from Orders.models import Order
    from django.db.models import Count, Q
    
    total = Order.objects.count()
    pending = Order.objects.filter(status='pending').count()
    completed = Order.objects.filter(status='completed').count()
    cancelled = Order.objects.filter(status='cancelled').count()
    
    return Response({
        'message': 'Order statistics retrieved successfully',
        'data': {
            'total': total,
            'pending': pending,
            'completed': completed,
            'cancelled': cancelled,
        }
    })
```

## Frontend Error Handling
I've added error handling in the frontend that will:
- Show error toasts with actual error messages
- Log errors to console for debugging
- Display helpful messages about potential permission issues

## Next Steps
1. **Check backend logs** - This is the most important step to see the actual error
2. **Verify user permissions** - Ensure the user has admin profile and correct group
3. **Test with SuperAdmin user** - Try logging in as SuperAdmin to test financial-reports endpoint
4. **Check database integrity** - Verify orders have valid foreign keys
5. **Apply fixes** - Based on the actual error in logs, apply the appropriate fix

## Console Output
The frontend now logs errors to the console. Check the browser console for:
- `Orders query error:` - Shows the actual error from orders API
- `Order stats query error:` - Shows the actual error from stats API
- `Transactions query error:` - Shows the actual error from transactions API
- `Transaction stats query error:` - Shows the actual error from transaction stats API

These will help identify the exact issue.

