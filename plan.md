# PillMate - Medication Management App

## Project Summary

A medication management application that allows users to register medications, set reminders, track intake, and view a medication calendar.

## Tech Stack

- **React 19** + **TypeScript**
- **TanStack Router** - routing
- **TanStack React Query** - server state management
- **Tailwind CSS v4** - styling
- **shadcn/ui** - UI components
- **date-fns** - date/time utilities
- **lucide-react** - icons
- **uuid** - unique ID generation
- **Web Notifications API + Audio API** - reminder system

## Storage

**localStorage** is used for data persistence (no backend).

---

## Phase 1: Infrastructure and Data Model

### Goals:
- Define TypeScript types for medications, reminders, and intake logs
- Build localStorage persistence layer
- Build Context and state management hooks

### Files:
- `src/features/medications/types.ts`
- `src/features/medications/store.ts`
- `src/features/medications/context.tsx`
- `src/features/medications/hooks.ts`

---

## Phase 2: App Layout and Navigation

### Goals:
- Build main Layout with Sidebar/Bottom Navigation
- Define routes: dashboard, medications, calendar
- Navigation between pages

### Pages:
- `/` - Dashboard
- `/medications` - Medication list (cards + add)
- `/calendar` - Medication calendar

---

## Phase 3: Dashboard Page

### Goals:
- Display table of all medications with:
  - Medication name
  - Dosage
  - Status (active/inactive)
  - Intake times
  - Last taken
- Summary stats (active medications count, taken today, remaining)

---

## Phase 4: Medications Page

### Goals:
- Display medications as cards with:
  - Medication name
  - Dosage
  - Assigned color
  - Weekly frequency
  - Intake times
- Add medication button (+)
- Add/Edit medication form:
  - Name
  - Dosage (e.g. 500mg)
  - Times per week
  - Days of the week
  - Intake hours
  - Color picker (palette)
  - Notes (optional)

---

## Phase 5: Calendar Page

### Goals:
- Monthly calendar view
- Days with medications show colored dots above the date
- Dot color = medication color
- Multiple medications on same day = multiple dots
- Click on day = show medication details for that day

---

## Phase 6: Notification and Reminder System

### Goals:
- Use Web Notifications API for push notifications
- Play alarm sound when medication time arrives
- Check every minute for upcoming medication times
- Mark as taken button in notification
- Save intake log with date and time

### Technical Notes:
- Request notification permission from user
- Use setInterval to check time
- Play sound with Audio API
- Background support (Service Worker where possible)

---

## Required shadcn Components

```
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add checkbox
npx shadcn@latest add popover
npx shadcn@latest add calendar
npx shadcn@latest add toast
npx shadcn@latest add separator
npx shadcn@latest add tabs
```

---

## Folder Structure

```
src/
  components/
    ui/              <- shadcn components
  features/
    medications/
      types.ts
      store.ts
      context.tsx
      hooks.ts
      components/
        MedicationCard.tsx
        MedicationForm.tsx
        MedicationTable.tsx
        DailyMedications.tsx
    notifications/
      notification-service.ts
      hooks.ts
      components/
        NotificationPermission.tsx
    calendar/
      components/
        CalendarView.tsx
        DayDetail.tsx
  layouts/
    AppLayout.tsx
  routes/
    __root.tsx
    index.tsx
    medications.tsx
    calendar.tsx
  lib/
    utils.ts
```
