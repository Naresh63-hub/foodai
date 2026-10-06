# Security Specification & Test Protocol

## 1. Data Invariants
- A UserProfile can only be read or written by the authenticated owner (`request.auth.uid == userId`).
- Subcollections `/users/{userId}/foodScans/{scanId}` and `/users/{userId}/dailyLogs/{logId}` can only be accessed by the parent `userId`.
- No user can read or modify another user's profile, scans, or logs.
- Document IDs must match standard safe alphanumeric patterns `^[a-zA-Z0-9_\\-]+$` with length <= 128 characters.
- System denies all unmapped collections with default-deny rule `match /{document=**} { allow read, write: if false; }`.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read**: Attempting to read `/users/target-user-123` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Cross-User Profile Hijack**: Authenticated User A attempting to update `/users/UserB` -> `PERMISSION_DENIED`.
3. **Ghost Field Poisoning**: Writing an unauthorized administrative field `isAdmin: true` into `/users/{userId}` -> `PERMISSION_DENIED`.
4. **Path Variable ID Injection**: Document ID containing directory traversal `../../evil` -> `PERMISSION_DENIED`.
5. **Over-Sized ID String Bomb**: Attempting to use a 10KB string as `{scanId}` -> `PERMISSION_DENIED`.
6. **Cross-User Food Scan Insert**: User A inserting a scan into `/users/UserB/foodScans/scan1` -> `PERMISSION_DENIED`.
7. **Cross-User Daily Log Read**: User A listing `/users/UserB/dailyLogs` -> `PERMISSION_DENIED`.
8. **Malicious Calorie Overflow**: Setting `caloriesKcal` to a negative number or non-numeric object -> `PERMISSION_DENIED`.
9. **Unverified Email Impersonation**: Attempting write without verified auth token -> `PERMISSION_DENIED`.
10. **Orphaned Subcollection Write**: User attempting to create a scan under non-existent user path -> `PERMISSION_DENIED`.
11. **Client Delegation Query Bypass**: Attempting broad scan query without user scope -> `PERMISSION_DENIED`.
12. **Immutable Field Tampering**: Attempting to update `userId` or `createdAt` on an existing food scan -> `PERMISSION_DENIED`.
