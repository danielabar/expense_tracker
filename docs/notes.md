# Notes

## Commands

```bash
# Create new rails application
rails new expense_tracker

# Install dependencies and initialize database
bin/setup

# Initialize Active Storage
bin/rails active_storage:install
bin/rails db:migrate

# Scaffold ExpenseReport model with routes, controller, and views
bin/rails g scaffold ExpenseReport \
  amount:decimal \
  description:text \
  incurred_on:date \
  receipt:attachment

# modify migration to add constraints
bin/rails db:migrate

# modify model to add corresponding validations
# modify form partial to conditionally display file attachment if one already exists
# (useful when editing so user can double-check what they already have)

# Run server
bin/dev
```

- Demo happy path
  - debugger on `@expense_report` model in controller after it's successfully saved - inspect `receipt.blob` - notice `id` populated and we can call `signed_id` on it
  - compare to active storage database tables (one to reference blob/file, another to associate model to blob)
  - compare to file storage (local, S3, R2, etc.)
  - i.e. three things need to be true for attachment success (db blob, db attachment, file system)
- Demo error on new + attach + validation error
  - debug inspect `@expense_report.receipt.blob` during validation error - notice `id` is nil, and calling `signed_id` errors on "new record"
  - also notice nothing new saved in db active storage tables, and no new file saved in storage file system - i.e. none of the three things we need were done due to validation error

### Solution Part 1
- First part of solution is to avoid 500 error - use `persisted?` rather than `attached?` which is only true when there actually exists a file to link to. Avoids error but not great UX because user has to select their file again.

### Solution Part 2
- Second part of solution: enable direct upload so that file will be uploaded, even in the event of a validation error (it won't be associated to the model in the database, but having it uploaded will help to recover from validation errors gracefully)
  - Follow instructions to enable direct uploads: https://guides.rubyonrails.org/active_storage_overview.html#direct-uploads OR https://api.rubyonrails.org/files/activestorage/README_md.html
  - Try error case again - notice two xhr requests running to create/upload file (first POST gets a signature ID, see Explanation below)
  - Then run `tree` command on `storage` dir, notice this time, there is a new file there
  - Check in database - there is a blob
  - i.e. 2 of the 3 things we need have happened, only thing missing is population of attachment table to associate blob to the model

### Solution Part 3
- Third part: Add hidden `expense_report.receipt.signed_id`, but only if `attached?` but not `persisted?`, so that the same selected file request gets submitted again after user fixes validation errors, and then it gets associated with model on saving (this works because this file has already been uploaded to storage from previous form submission attempt AND also populated blob table in database):
  -IMPORTANT: It creates a new blob in database table `active_storage_blobs`, even when validation fails, THIS is what allows us to get a signed_id even if model not yet associated with the attachment.
  - i.e. because of direct upload, this `signed_id` corresponds to an uploaded file in storage, so if submitted again, Rails will be able to associate this file to the expense_report model

### Solution Part 4
- Fourth part: Let the user know that we still have their file name in memory so they don't need to select the file again (because otherwise, user doesn't realize that we've "saved" the file for them).
  - Note that filename is available on the model in memory, even if validation error: `expense_report.receipt.filename`
  - Unfortunately, can't simply set the native file input's `value` property (not allowed, part of spec, reference MDN: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#notes)
  - Therefore we'll need to hide the native file input and build a custom one for display purposes, and manipulate it with JavaScript - which in Rails is done with Stimulus controllers (ref: my previous post on stimulus how to)
  - The custom file input consists of a label which looks like a text input to show file name, and a button to trigger file selection
  - If a previously uploaded file exists (but isn't persisted) - label displays the filename instead of `"Choose a file"`.
  - This makes it feel like the file is already selected without interfering with browser behavior
  - If the user selects a new file - label updates dynamically to show the new filename and new file is uploaded normally and replaces the old one.
  - Also add accessibility to ensure keyboard user that focuses on custom file input button and hits Enter -> trigger underlying native file input selection

### Solution Part 5
- Fifth part (optional): Extract to partial for re-usability if project has many places with file uploads
- ASIDE: Periodically run cleanup job because may end up with files in storage not associated to any model if user abandons the form (consequence of using direct uploads)

[Reference PR](https://github.com/rubyforgood/human-essentials/pull/4937)

## Local Fresh Start

```bash
# `storage` dir contains the database as well
find storage -type f ! -name '.keep' -exec rm -f {} +
bin/rails db:reset
```

## Create new expense report with attachment successfully

### Rails server output

```
Started POST "/expense_reports" for ::1 at 2025-03-15 07:10:54 -0400
Processing by ExpenseReportsController#create as TURBO_STREAM
  Parameters: {
  "authenticity_token" => "[FILTERED]",
  "expense_report" => {
    "amount" => "123.45",
    "description" => "Uber ride to the airport and back for business trip.",
    "incurred_on" => "2025-03-01",
    "receipt" => #<ActionDispatch::Http::UploadedFile:0x000000013c9f1b30
      @tempfile = #<Tempfile:/var/folders/0c/l5km59ks3l59nl8yx95ygxqm0000gn/T/RackMultipart20250315-39095-g6tar4.pdf>,
      @content_type = "application/pdf",
      @original_filename = "distribution_incomplete_address.pdf",
      @headers = "Content-Disposition: form-data; name=\"expense_report[receipt]\"; filename=\"distribution_incomplete_address.pdf\"\r\nContent-Type: application/pdf\r\n"
    >,
  },
  "commit" => "Create Expense report"
}

=== TRANSACTION TO PERSIST EXPENSE REPORT MODEL, UPLOAD FILE TO STORAGE, AND POPULATE FILE INFORMATION IN DATABASE, AND ASSOCIATE MODEL WITH FILE ===
  TRANSACTION (0.0ms)  BEGIN immediate TRANSACTION /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'

  === PERSIST EXPENSE REPORT MODEL IN DATABASE ===
  ExpenseReport Create (0.6ms)  INSERT INTO "expense_reports" ("amount", "description", "incurred_on", "created_at", "updated_at") VALUES (123.45, 'Uber ride to the airport and back for business trip.', '2025-03-01', '2025-03-15 11:10:54.098587', '2025-03-15 11:10:54.098587') RETURNING "id" /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'

  === PERSIST FILE BLOB INFORMATION IN DATABASE ===
  ActiveStorage::Blob Load (0.0ms)  SELECT "active_storage_blobs".* FROM "active_storage_blobs" INNER JOIN "active_storage_attachments" ON "active_storage_blobs"."id" = "active_storage_attachments"."blob_id" WHERE "active_storage_attachments"."record_id" = 1 AND "active_storage_attachments"."record_type" = 'ExpenseReport' AND "active_storage_attachments"."name" = 'receipt' LIMIT 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ActiveStorage::Attachment Load (0.0ms)  SELECT "active_storage_attachments".* FROM "active_storage_attachments" WHERE "active_storage_attachments"."record_id" = 1 AND "active_storage_attachments"."record_type" = 'ExpenseReport' AND "active_storage_attachments"."name" = 'receipt' LIMIT 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ActiveStorage::Blob Create (0.0ms)  INSERT INTO "active_storage_blobs" ("key", "filename", "content_type", "metadata", "service_name", "byte_size", "checksum", "created_at") VALUES ('ilhvhpgq3za2u6g2ri11mcz7orzv', 'distribution_incomplete_address.pdf', 'application/pdf', '{"identified":true}', 'local', 42223, 'IO+1GEvBwGHnvuy0kYIpzw==', '2025-03-15 11:10:54.106891') RETURNING "id" /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'

  === ASSOCIATE EXPENSE REPORT MODEL TO FILE BLOB IN DATABASE ===
  ActiveStorage::Attachment Create (0.0ms)  INSERT INTO "active_storage_attachments" ("name", "record_type", "record_id", "blob_id", "created_at") VALUES ('receipt', 'ExpenseReport', 1, 1, '2025-03-15 11:10:54.107618') RETURNING "id" /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ExpenseReport Update (0.0ms)  UPDATE "expense_reports" SET "updated_at" = '2025-03-15 11:10:54.108194' WHERE "expense_reports"."id" = 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  TRANSACTION (0.2ms)  COMMIT TRANSACTION /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'

=== UPLOAD FILE TO STORAGE ===
=== TODO: IF MODEL VALIDATION FAILS, DOES FILE STILL GET UPLOADED TO STORAGE? ===
  Disk Storage (0.4ms) Uploaded file to key: ilhvhpgq3za2u6g2ri11mcz7orzv (checksum: IO+1GEvBwGHnvuy0kYIpzw==)

=== TRANSACTION TO ANALYZE FILE TO POPULATE METADATA (LESS IMPORTANT FOR OUR STUDY) ===
  TRANSACTION (0.0ms)  BEGIN immediate TRANSACTION /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ActiveStorage::Blob Update (0.5ms)  UPDATE "active_storage_blobs" SET "metadata" = '{"identified":true,"analyzed":true}' WHERE "active_storage_blobs"."id" = 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ActiveStorage::Attachment Load (0.0ms)  SELECT "active_storage_attachments".* FROM "active_storage_attachments" WHERE "active_storage_attachments"."blob_id" = 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ExpenseReport Load (0.0ms)  SELECT "expense_reports".* FROM "expense_reports" WHERE "expense_reports"."id" = 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  ExpenseReport Update (0.0ms)  UPDATE "expense_reports" SET "updated_at" = '2025-03-15 11:10:54.113292' WHERE "expense_reports"."id" = 1 /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'
  TRANSACTION (0.0ms)  COMMIT TRANSACTION /*action='create',application='ExpenseTracker',controller='expense_reports'*/
  ↳ app/controllers/expense_reports_controller.rb:27:in 'block in ExpenseReportsController#create'

Redirected to http://localhost:3000/expense_reports/1
Completed 302 Found in 68ms (ActiveRecord: 1.8ms (10 queries, 0 cached) | GC: 0.0ms)
```

### Database Contents

```
sqlite> .mode line

=== STORES INFORMATION ABOUT THE FILE ===
sqlite> select * from active_storage_blobs;
          id = 1
         key = ilhvhpgq3za2u6g2ri11mcz7orzv
    filename = distribution_incomplete_address.pdf
content_type = application/pdf
    metadata = {"identified":true,"analyzed":true}
service_name = local
   byte_size = 42223
    checksum = IO+1GEvBwGHnvuy0kYIpzw==
  created_at = 2025-03-15 11:10:54.106891

=== ASSOCIATES EXPENSE REPORT MODEL TO FILE BLOB ===
sqlite> select * from active_storage_attachments;
         id = 1
       name = receipt
record_type = ExpenseReport
  record_id = 1
    blob_id = 1
 created_at = 2025-03-15 11:10:54.107618

=== HERE IS OUR EXPENSE REPORT MODEL ===
sqlite> select * from expense_reports;
         id = 1
     amount = 123.45
description = Uber ride to the airport and back for business trip.
incurred_on = 2025-03-01
 created_at = 2025-03-15 11:10:54.098587
 updated_at = 2025-03-15 11:10:54.113292
```

### Local File Storage

```
tree storage -I "*.sqlite3*|*sqlite3*|*/.*" --prune

storage
└── il
    └── hv
        └── ilhvhpgq3za2u6g2ri11mcz7orzv
```

`ilhvhpgq3za2u6g2ri11mcz7orzv` is the pdf file we just uploaded.

## Create new expense report with attachment and form validation error

Eg: forget to fill out description

Rails server output:

```
Started POST "/expense_reports" for ::1 at 2025-03-15 07:43:03 -0400
Processing by ExpenseReportsController#create as TURBO_STREAM
  Parameters: {"authenticity_token" => "[FILTERED]", "expense_report" => {"amount" => "222.22", "description" => "", "incurred_on" => "2025-03-08", "receipt" => #<ActionDispatch::Http::UploadedFile:0x000000013d77d7b8 @tempfile=#<Tempfile:/var/folders/0c/l5km59ks3l59nl8yx95ygxqm0000gn/T/RackMultipart20250315-39095-m6h5ap.pdf>, @content_type="application/pdf", @original_filename="distribution_pickup.pdf", @headers="Content-Disposition: form-data; name=\"expense_report[receipt]\"; filename=\"distribution_pickup.pdf\"\r\nContent-Type: application/pdf\r\n">}, "commit" => "Create Expense report"}
  Rendering layout layouts/application.html.erb
  Rendering expense_reports/new.html.erb within layouts/application
  Rendered expense_reports/_form.html.erb (Duration: 6.6ms | GC: 0.0ms)
  Rendered expense_reports/new.html.erb within layouts/application (Duration: 6.7ms | GC: 0.0ms)
  Rendered layout layouts/application.html.erb (Duration: 6.9ms | GC: 0.0ms)
Completed 500 Internal Server Error in 29ms (ActiveRecord: 0.0ms (0 queries, 0 cached) | GC: 0.0ms)
07:43:03 web.1  |
07:43:03 web.1  |
07:43:03 web.1  |
ActionView::Template::Error (Cannot get a signed_id for a new record)
Caused by: ArgumentError (Cannot get a signed_id for a new record)
07:43:03 web.1  |
Information for: ActionView::Template::Error (Cannot get a signed_id for a new record):
    38:     <% if expense_report.receipt.attached? %>
    39:       <div class="mt-2">
    40:         <strong class="block font-medium mb-1">Current Receipt:</strong>
    41:         <%= link_to expense_report.receipt.filename, expense_report.receipt, class: "text-gray-700 underline hover:no-underline" %>
    42:       </div>
    43:     <% end %>
    44:   </div>
07:43:03 web.1  |
app/views/expense_reports/_form.html.erb:41
app/views/expense_reports/_form.html.erb:1
app/views/expense_reports/new.html.erb:6
app/controllers/expense_reports_controller.rb:31:in 'block (2 levels) in ExpenseReportsController#create'
app/controllers/expense_reports_controller.rb:26:in 'ExpenseReportsController#create'
07:43:03 web.1  |
Information for cause: ArgumentError (Cannot get a signed_id for a new record):
07:43:03 web.1  |
app/views/expense_reports/_form.html.erb:41
app/views/expense_reports/_form.html.erb:1
app/views/expense_reports/new.html.erb:6
app/controllers/expense_reports_controller.rb:31:in 'block (2 levels) in ExpenseReportsController#create'
app/controllers/expense_reports_controller.rb:26:in 'ExpenseReportsController#create'
```

Explanation:

- Encounters validation error so model never gets saved, and immediately tries to render the new form again.
- It never uploaded the attachment to storage or any of the database population for active
- But `expense_report.receipt.attached?` is true, so it tries to render a link to it, which requires a `signed_id`
- Why is `.attached?` true - because user did attempt a file upload, ref: https://api.rubyonrails.org/classes/ActiveStorage/Attached/One.html#method-i-attached-3F
- But we also have `persisted?` which returns false, ref: https://api.rubyonrails.org/classes/ActiveStorage/Attached/One.html#method-i-attached-3F

Place `debugger` in controller `create` method:
```ruby
  def create
    @expense_report = ExpenseReport.new(expense_report_params)

    respond_to do |format|
      if @expense_report.save
        debugger
        format.html { redirect_to @expense_report, notice: "Expense report was successfully created." }
        format.json { render :show, status: :created, location: @expense_report }
      else
        debugger
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: @expense_report.errors, status: :unprocessable_entity }
      end
    end
  end
```

Debug session
```
(ruby) @expense_report
#<ExpenseReport:0x00000001311585d8 id: nil, amount: 0.22222e3, description: "", incurred_on: "2025-03-08", created_at: nil, updated_at: nil>
(ruby) @expense_report.receipt
#<ActiveStorage::Attached::One:0x0000000134cd30b8 @name="receipt", @record=#<ExpenseReport:0x00000001311585d8 id: nil, amount: 0.22222e3, description: "", incurred_on: "2025-03-08", created_at: nil, updated_at: nil>>
(ruby) @expense_report.receipt.attached?
true
(ruby) @expense_report.receipt.persisted?
false
(ruby) @expense_report.receipt.record
#<ExpenseReport:0x00000001311585d8 id: nil, amount: 0.22222e3, description: "", incurred_on: "2025-03-08", created_at: nil, updated_at: nil>
```

When validation fails it does associate a `blob` with the model in-memory, but there's no corresponding key in storage or database, it never got that far because model validation failed.
Notice `created_at` is `nil` which means this is still a new record
```
(ruby) @expense_report.receipt.blob
#<ActiveStorage::Blob:0x000000013823c6c8
 id: nil,
 key: "y66z53k18o3usxqudoyxvt623nxl",
 filename: "document2.md",
 content_type: "text/x-markdown",
 metadata: {"identified" => true},
 service_name: "local",
 byte_size: 235,
 checksum: "fptXS0vdXt3odski70YlZw==",
 created_at: nil>

 (ruby) @expense_report.receipt.blob.signed_id
eval error: Cannot get a signed_id for a new record
  /Users/dbaron/.rbenv/versions/3.4.2/lib/ruby/gems/3.4.0/gems/activerecord-8.0.2/lib/active_record/signed_id.rb:133:in 'ActiveRecord::SignedId#signed_id'
  /Users/dbaron/.rbenv/versions/3.4.2/lib/ruby/gems/3.4.0/gems/activestorage-8.0.2/app/models/active_storage/blob.rb:163:in 'ActiveStorage::Blob#signed_id'
  (rdbg)//Users/dbaron/projects/meblog_projects/expense_tracker/app/controllers/expense_reports_controller.rb:1:in 'block in ExpenseReportsController#create'
 ```

Compare when its successful:
```
(ruby) @expense_report.receipt.blob
#<ActiveStorage::Blob:0x000000012837fc98
 id: 2,
 key: "kvr2sc0y9iy35x3ryklxi6kpf22h",
 filename: "distribution_pickup.pdf",
 content_type: "application/pdf",
 metadata: {"identified" => true, "analyzed" => true},
 service_name: "local",
 byte_size: 42003,
 checksum: "yVkzTLptS880DwluCgkthg==",
 created_at: "2025-03-15 11:58:59.218142000 +0000">

(ruby) @expense_report.receipt.blob.signed_id
"eyJfcmFpbHMiOnsiZGF0YSI6MiwicHVyIjoiYmxvYl9pZCJ9fQ==--cb69cfd5043d24d8af9c289739183e40974271c6"
```

Success `key` matches up with what got created in storage:
```
tree storage -I "*.sqlite3*|*sqlite3*|*/.*" --prune
storage
├── il
│   └── hv
│       └── ilhvhpgq3za2u6g2ri11mcz7orzv
└── kv
    └── r2
        └── kvr2sc0y9iy35x3ryklxi6kpf22h
```

## Direct Upload

xhr from browser dev tools Network tab:

Request:
```
curl 'http://localhost:3000/rails/active_storage/direct_uploads' \
  -H 'Accept: application/json' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:3000' \
  -H 'Referer: http://localhost:3000/expense_reports/new' \
  -H 'X-CSRF-Token: abc123' \
  -H 'X-Requested-With: XMLHttpRequest' \
  --data-raw '{"blob":{"filename":"dbase.pdf","content_type":"application/pdf","byte_size":7171,"checksum":"PnVMB8Sc/us7Jy4wxuy07w=="}}'
```

Response:
```
{
  "id": 5,
  "key": "8xfnpswh8l48kha8wzb2j0uh1sdw",
  "filename": "dbase.pdf",
  "content_type": "application/pdf",
  "metadata": {},
  "service_name": "local",
  "byte_size": 7171,
  "checksum": "PnVMB8Sc/us7Jy4wxuy07w==",
  "created_at": "2025-03-15T20:44:48.066Z",
  "attachable_sgid": "eyJfcmFpbHMiOnsiZGF0YSI6ImdpZDovL2V4cGVuc2UtdHJhY2tlci9BY3RpdmVTdG9yYWdlOjpCbG9iLzU_ZXhwaXJlc19pbiIsInB1ciI6ImF0dGFjaGFibGUifX0=--d12eac68d7948a154543370e549396162af9a6c4",
  "signed_id": "eyJfcmFpbHMiOnsiZGF0YSI6NSwicHVyIjoiYmxvYl9pZCJ9fQ==--8c80be4316af3a6b0661b02fcdde3beaae3c8139",
  "direct_upload": {
    "url": "http://localhost:3000/rails/active_storage/disk/eyJfcmFpbHMiOnsiZGF0YSI6eyJrZXkiOiI4eGZucHN3aDhsNDhraGE4d3piMmowdWgxc2R3IiwiY29udGVudF90eXBlIjoiYXBwbGljYXRpb24vcGRmIiwiY29udGVudF9sZW5ndGgiOjcxNzEsImNoZWNrc3VtIjoiUG5WTUI4U2MvdXM3Snk0d3h1eTA3dz09Iiwic2VydmljZV9uYW1lIjoibG9jYWwifSwiZXhwIjoiMjAyNS0wMy0xNVQyMDo0OTo0OC4wNzBaIiwicHVyIjoiYmxvYl90b2tlbiJ9fQ==--cc1e35c4e9366ffd04d4262b5688e62ca744f52f",
    "headers": {
      "Content-Type": "application/pdf"
    }
  }
}
```

```
curl 'http://localhost:3000/rails/active_storage/disk/eyJfcmFpbHMiOnsiZGF0YSI6eyJrZXkiOiI4eGZucHN3aDhsNDhraGE4d3piMmowdWgxc2R3IiwiY29udGVudF90eXBlIjoiYXBwbGljYXRpb24vcGRmIiwiY29udGVudF9sZW5ndGgiOjcxNzEsImNoZWNrc3VtIjoiUG5WTUI4U2MvdXM3Snk0d3h1eTA3dz09Iiwic2VydmljZV9uYW1lIjoibG9jYWwifSwiZXhwIjoiMjAyNS0wMy0xNVQyMDo0OTo0OC4wNzBaIiwicHVyIjoiYmxvYl90b2tlbiJ9fQ==--cc1e35c4e9366ffd04d4262b5688e62ca744f52f' \
  -X 'PUT' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.9' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/pdf' \
  -H 'Origin: http://localhost:3000' \
  -H 'Referer: http://localhost:3000/expense_reports/new' \
  --data-raw $'%PDF-1.3\n%Äåòåë§ó ...\n'
```

### Explanation

When you enable **direct uploads** in Rails Active Storage, you will see **two XHR requests** in the browser’s DevTools Network tab. Each serves a different purpose:

**First Request: Create a Blob Record**

**Endpoint:** `POST /rails/active_storage/direct_uploads`
**Purpose:** Registers metadata about the file with Active Storage before the actual upload.

Breakdown of the first request:

- This request sends JSON data describing the file (`filename`, `content_type`, `byte_size`, and `checksum`).
- Rails Active Storage responds with a **signed upload URL** and metadata required for the second request.

What Happens?
- Active Storage creates a **Blob record** in the database (but not yet attached to a model).
- It generates a **pre-signed URL** for direct upload to the storage service (local disk, S3, etc.).
- The client (browser) receives this URL and proceeds with the actual upload.

Second Request: Upload File to Storage
**Endpoint:** `PUT /rails/active_storage/disk/:signed_id` (for local storage)
**Purpose:** Uploads the actual file to the storage backend.

Breakdown of the second request:
- The browser sends the **file contents** using a `PUT` request.
- The upload happens **directly** to the storage service (local disk, S3, etc.), bypassing Rails controllers.
- If using **S3 or another cloud provider**, this request would go directly to S3 instead of your Rails app.

What Happens?
- The file is stored in the backend.
- Once the upload is complete, the **blob is ready to be attached** to a model.

Why Two Requests?
1. The **first request** registers the file and gets a **pre-signed URL**.
2. The **second request** uses that URL to upload the file **directly** to storage.
   - This prevents large file uploads from being **proxied through Rails**, improving performance.

What Happens After Upload?
- When you **submit the form**, Rails attaches the **uploaded blob** to your model using the `ActiveStorage::Attachment` table.
- If the form submission fails (e.g., validation error), the uploaded blob **remains in storage** but unlinked. Rails has a cleanup task for orphaned blobs.

### Direct Upload + Validation Error + Debug Session

IMPORTANT: It creates a new blob in database table `active_storage_blobs`, even when validation fails, THIS is what allows us to get a signed_id even if model not yet associated with the attachment.

```
sqlite> select * from active_storage_blobs;
id  key                           filename                             content_type     metadata                             service_name  byte_size  checksum                  created_at
--  ----------------------------  -----------------------------------  ---------------  -----------------------------------  ------------  ---------  ------------------------  --------------------------
...
NEW RECORD!
10  87oksu56vhvq8gvjd15goxq6u74c  wrong_headers.csv                    text/csv                                              local         105        gefO5tr4Nq09vqRhnJDU9Q==  2025-03-17 12:47:04.152308
```

Debug:
```
(ruby) @expense_report.receipt.blob
#<ActiveStorage::Blob:0x0000000134a96a48
 id: 10,
 key: "87oksu56vhvq8gvjd15goxq6u74c",
 filename: "wrong_headers.csv",
 content_type: "text/csv",
 metadata: {"identified" => true},
 service_name: "local",
 byte_size: 105,
 checksum: "gefO5tr4Nq09vqRhnJDU9Q==",
 created_at: "2025-03-17 12:47:04.152308000 +0000">
(ruby) @expense_report.receipt.blob.signed_id
"eyJfcmFpbHMiOnsiZGF0YSI6MTAsInB1ciI6ImJsb2JfaWQifX0=--1077b88e6c9a43cc6d372751ccba27748a22b9a7"

(ruby) @expense_report.receipt.signed_id
"eyJfcmFpbHMiOnsiZGF0YSI6MTAsInB1ciI6ImJsb2JfaWQifX0=--1077b88e6c9a43cc6d372751ccba27748a22b9a7"

# Also have access to filename
(ruby) @expense_report.receipt.blob.filename
#<ActiveStorage::Filename:0x0000000136dab588 @filename="wrong_headers.csv">
(ruby) @expense_report.receipt.filename
#<ActiveStorage::Filename:0x00000001377b3bc0 @filename="wrong_headers.csv">
```
