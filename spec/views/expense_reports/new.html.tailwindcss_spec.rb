require 'rails_helper'

RSpec.describe "expense_reports/new", type: :view do
  before(:each) do
    assign(:expense_report, ExpenseReport.new(
      amount: "9.99",
      description: "MyText",
      receipt: nil
    ))
  end

  it "renders new expense_report form" do
    render

    assert_select "form[action=?][method=?]", expense_reports_path, "post" do

      assert_select "input[name=?]", "expense_report[amount]"

      assert_select "textarea[name=?]", "expense_report[description]"

      assert_select "input[name=?]", "expense_report[receipt]"
    end
  end
end
