require 'rails_helper'

RSpec.describe "expense_reports/edit", type: :view do
  let(:expense_report) {
    ExpenseReport.create!(
      amount: "9.99",
      description: "MyText",
      receipt: nil
    )
  }

  before(:each) do
    assign(:expense_report, expense_report)
  end

  it "renders the edit expense_report form" do
    render

    assert_select "form[action=?][method=?]", expense_report_path(expense_report), "post" do

      assert_select "input[name=?]", "expense_report[amount]"

      assert_select "textarea[name=?]", "expense_report[description]"

      assert_select "input[name=?]", "expense_report[receipt]"
    end
  end
end
