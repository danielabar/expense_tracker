json.extract! expense_report, :id, :amount, :description, :incurred_on, :receipt, :created_at, :updated_at
json.url expense_report_url(expense_report, format: :json)
json.receipt url_for(expense_report.receipt)
