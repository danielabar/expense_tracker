require "rails_helper"

RSpec.describe ExpenseReportsController, type: :routing do
  describe "routing" do
    it "routes to #index" do
      expect(get: "/expense_reports").to route_to("expense_reports#index")
    end

    it "routes to #new" do
      expect(get: "/expense_reports/new").to route_to("expense_reports#new")
    end

    it "routes to #show" do
      expect(get: "/expense_reports/1").to route_to("expense_reports#show", id: "1")
    end

    it "routes to #edit" do
      expect(get: "/expense_reports/1/edit").to route_to("expense_reports#edit", id: "1")
    end


    it "routes to #create" do
      expect(post: "/expense_reports").to route_to("expense_reports#create")
    end

    it "routes to #update via PUT" do
      expect(put: "/expense_reports/1").to route_to("expense_reports#update", id: "1")
    end

    it "routes to #update via PATCH" do
      expect(patch: "/expense_reports/1").to route_to("expense_reports#update", id: "1")
    end

    it "routes to #destroy" do
      expect(delete: "/expense_reports/1").to route_to("expense_reports#destroy", id: "1")
    end
  end
end
