class CreateExpenseReports < ActiveRecord::Migration[8.0]
  def change
    create_table :expense_reports do |t|
      t.decimal :amount, precision: 10, scale: 2, null: false # Precision for up to 99999999.99
      t.text :description, null: false
      t.date :incurred_on, null: false

      t.timestamps
    end
  end
end
