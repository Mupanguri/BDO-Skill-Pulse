# BDO Skills Pulse — Pre-Pilot Admin Verification Checklist

Work through each section before sending pilot emails. Tick every item.

---

## 1. Platform Access

- [ ] Platform loads at `http://10.0.0.15:9000`
- [ ] Login page renders correctly (no blank screen, no JS errors in browser console)
- [ ] HTTPS/HTTP redirect works as expected

---

## 2. Authentication Flows

### Password login (existing password users)
- [ ] Enter email → method choice screen appears ("Enter Password" / "Send me a code instead")
- [ ] Choose "Enter Password" → password form appears
- [ ] Enter correct password → login succeeds, redirected to dashboard
- [ ] Enter wrong password → error message shown, not logged in

### OTP login (pre-seeded / no-password users)
- [ ] Enter email → method choice screen appears
- [ ] Choose "Send me a code instead" → "Code sent" message appears
- [ ] Enter correct OTP → login succeeds
- [ ] Enter wrong/expired OTP → error message shown
- [ ] OTP expires after 10 minutes (do not test in prod; confirm logic in code)

### Malawi staff login (`@bdo.co.mw`)
- [ ] A Malawi user (e.g. `echipeta@bdo.co.mw`) can request an OTP and log in
- [ ] Profile page loads correctly for Malawi user
- [ ] Malawi user sees "Set a password" prompt (no password set)

---

## 3. User Management (Admin Panel)

- [ ] Admin can view full user list
- [ ] Search / filter by department works
- [ ] Admin can see both `@bdo.co.zw` and `@bdo.co.mw` users in the list
- [ ] Admin can toggle isAdmin / isHR flags
- [ ] Soft-delete (deactivate) a test user → user disappears from active list
- [ ] Restore deleted user works (if feature exists)

---

## 4. Quiz / Session Creation

- [ ] Admin can create a new quiz session
- [ ] Add at least 2 questions with 4 answer options and correct answer marked
- [ ] Set session title, description, time limit
- [ ] Set question order (random / fixed)
- [ ] Save session → session appears in session list
- [ ] Session status can be toggled (active / inactive / closed)

---

## 5. Assigning Sessions to Users

- [ ] Admin can assign a session to specific users or departments
- [ ] Assigned users see the quiz on their dashboard after login
- [ ] Non-assigned users do not see the quiz

---

## 6. Taking a Quiz (as a regular user)

- [ ] Log in as a non-admin test user
- [ ] Assigned quiz appears on dashboard
- [ ] Timer starts when quiz begins
- [ ] Can navigate between questions
- [ ] Submit quiz → results / score shown immediately
- [ ] Completed quiz no longer appears as "pending"

---

## 7. Results & Analytics (Admin)

- [ ] Admin can view quiz results per session
- [ ] Results show per-user scores
- [ ] Analytics page loads (charts, completion rates)
- [ ] Export / download results (if feature exists)
- [ ] Results correctly reflect submitted answers

---

## 8. Profile Page

- [ ] User with no password sees "Set a Password" section with amber banner
- [ ] User with existing password sees "Change Password" section
- [ ] Set password flow: enter new password → OTP sent → enter OTP → password saved
- [ ] Weak password (e.g. "password") rejected with clear error message
- [ ] Dark mode toggle works and persists after logout/login

---

## 9. Notifications

- [ ] Admin can send a notification to all users (if feature exists)
- [ ] Notification bell shows unread count
- [ ] Clicking notification marks it as read

---

## 10. Audit Logs

- [ ] Audit logs page loads for admin
- [ ] Recent actions (logins, quiz completions) appear in logs
- [ ] Logs show correct timestamps and user emails

---

## 11. Super Admin Portal (if applicable)

- [ ] Super admin can access `/portal-select` and choose Super Admin portal
- [ ] Cross-organisation user management visible
- [ ] Timer and question-order settings available per session

---

## 12. Performance & Error Handling

- [ ] Page loads in under 3 seconds on the local network
- [ ] No broken images or missing icons
- [ ] 404 page works for unknown routes (try `/app/doesnotexist`)
- [ ] Logging out clears session; back button does not restore authenticated view

---

## Sign-off

| Item | Person | Date |
|------|--------|------|
| Authentication flows verified | | |
| Quiz creation verified | | |
| Results & analytics verified | | |
| Malawi user login verified | | |
| Ready to send pilot emails | | |
