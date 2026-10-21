# Enrollment Form Flow Chart

```mermaid
flowchart TD
    A[Student logs in or registers] --> B[Student Dashboard]
    B --> C{Already enrolled?}

    C -- Yes, Approved --> D[View timetable / profile]
    C -- No --> E[Click Enroll Now]

    E --> F[Step 1: Personal Information]
    F --> G[Step 2: Address Information]
    G --> H[Step 3: Guardian Information]

    H --> I[Step 4: Enrollment Info]
    I --> J{Student type / grade level}

    J --> K[Upload report card front image]
    K --> L[Upload report card back image]
    L --> M[OCR reads grades and computes average]
    M --> N{Requirements needed?}

    N -- Yes --> O[Upload required documents]
    O --> O1[PSA Birth Certificate]
    O --> O2[Good Moral Certificate]
    O --> O3[Certificate of Transfer if transferee]
    O3 --> P[Review & submit application]

    N -- No --> P[Review & submit application]

    P --> Q[Submit enrollment form]
    Q --> R[Staff reviews application]
    R --> S{Decision}

    S -- Approved --> T[Section assigned]
    T --> U[Timetable becomes available]
    U --> V[Student dashboard shows approved status]

    S -- Pending --> W[Application remains under review]
    W --> X[Student waits for notification]

    S -- Rejected --> Y[Student can enroll again]
    Y --> E

    classDef start fill:#0B2B26,stroke:#0B2B26,color:#fff;
    classDef process fill:#DCEFE0,stroke:#0B2B26,color:#163832;
    classDef decision fill:#F3E6C5,stroke:#B38714,color:#163832;
    classDef end fill:#E8F5EC,stroke:#2D6A4F,color:#163832;

    class A,B,E,F,G,H,I,K,L,M,O,O1,O2,O3,P,Q,R,T,U,V,W,X,Y start;
    class C,J,N,S process;
    class D end;
```

## Notes

This flow matches the current enrollment form behavior in the student portal, including:

- registration steps for personal, address, and guardian details
- enrollment info selection for student type and grade level
- report card upload and OCR reading
- conditional document requirements
- review and submission
- admin approval, rejection, or pending status
